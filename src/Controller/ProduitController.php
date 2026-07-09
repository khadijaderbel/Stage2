<?php

namespace App\Controller;

use App\Entity\Categorie;
use App\Entity\HistoriqueImportation;
use App\Entity\Produit;
use App\Form\ProduitType;
use App\Repository\HistoriqueImportationRepository;
use App\Service\AiProviderManager;
use Doctrine\ORM\EntityManagerInterface;
use Knp\Component\Pager\PaginatorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/produit')]
class ProduitController extends AbstractController
{
    // ══════════════════════════════════════════════════════════════════
    //  INDEX
    // ══════════════════════════════════════════════════════════════════

    #[Route('/', name: 'app_produit_index', methods: ['GET'])]
    public function index(
        EntityManagerInterface $em,
        PaginatorInterface $paginator,
        Request $request,
        HistoriqueImportationRepository $historiqueRepo
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $categories  = $em->getRepository(Categorie::class)->findBy([], ['nom' => 'ASC']);
        $historiques = $historiqueRepo->findAllOrderedByDate(10);

        $query = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->leftJoin('p.categorie', 'c')
            ->leftJoin('p.utilisateur', 'u')
            ->orderBy('p.dateCreation', 'DESC')
            ->getQuery();

        $produits = $paginator->paginate(
            $query,
            $request->query->getInt('page', 1),
            5
        );

        return $this->render('produit/index.html.twig', [
            'produits'    => $produits,
            'categories'  => $categories,
            'historiques' => $historiques,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  IMPORT
    // ══════════════════════════════════════════════════════════════════

    #[Route('/import', name: 'app_produit_import', methods: ['POST'])]
    public function import(Request $request, EntityManagerInterface $em, AiProviderManager $aiProviderManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $aiProvider = $request->getSession()->get('ai_provider', 'gemini');

        $file = $request->files->get('importFile');
        if (!$file) {
            return new JsonResponse([
                'action'  => 'erreur',
                'message' => 'Aucun fichier reçu.',
            ], 400);
        }

        $extension    = strtolower($file->getClientOriginalExtension());
        $originalName = $file->getClientOriginalName();

        // ── 1. Parser le fichier ──────────────────────────────────────
        try {
            $rows = match ($extension) {
                'json'        => $this->parseJson($file->getPathname()),
                'csv'         => $this->parseCsv($file->getPathname()),
                'xlsx', 'xls' => $this->parseExcel($file->getPathname()),
                default       => throw new \InvalidArgumentException(
                    "Format « .{$extension} » non supporté. Utilisez JSON, CSV, XLSX ou XLS."
                ),
            };
        } catch (\Throwable $e) {
            $this->creerHistoriqueEchec($em, $originalName, $extension, $e->getMessage());
            return new JsonResponse([
                'action'  => 'erreur',
                'message' => $e->getMessage(),
            ], 422);
        }

        if (empty($rows)) {
            $this->creerHistoriqueEchec($em, $originalName, $extension, 'Le fichier est vide ou ne contient aucune ligne valide.');
            return new JsonResponse([
                'action'  => 'erreur',
                'message' => 'Le fichier est vide ou ne contient aucune ligne valide.',
            ], 422);
        }

        $fixFormat = (bool) $request->request->get('fixFormat', false);
        $problemesFormat = $this->detecterCaracteristiquesIncompatibles($rows);

        if (!empty($problemesFormat) && !$fixFormat) {
            return new JsonResponse([
                'action'  => 'format_incompatible',
                'lignes'  => $problemesFormat,
                'message' => count($problemesFormat) === 1
                    ? '1 ligne utilise des virgules/points-virgules dans les caractéristiques (non autorisé).'
                    : count($problemesFormat) . ' lignes utilisent des virgules/points-virgules dans les caractéristiques (non autorisé).',
            ]);
        }

        // ── 2. Détecter les catégories inconnues ─────────────────────
        $categoriesConnues   = $this->chargerCategoriesIndexees($em);
        $categoriesInconnues = $this->detecterCategoriesInconnues($rows, $categoriesConnues);

        $skipCategories = (bool) $request->request->get('skipCategories', false);

        if (!empty($categoriesInconnues) && !$skipCategories) {
            return new JsonResponse([
                'action'              => 'categories_manquantes',
                'categoriesInconnues' => array_values($categoriesInconnues),
                'message'             => count($categoriesInconnues) === 1
                    ? "La catégorie « " . reset($categoriesInconnues) . " » n'existe pas dans le système."
                    : count($categoriesInconnues) . ' catégorie(s) inconnue(s) détectée(s) dans le fichier.',
            ]);
        }

        // ── 3. Créer l'historique EN COURS ───────────────────────────
        $user       = $this->getUser();
        $historique = new HistoriqueImportation();
        $historique->setNomFichier($originalName);
        $historique->setFormatFichier($extension);
        $historique->setUser($user);
        $historique->setNombreLignes(count($rows));
        $historique->setStatut(HistoriqueImportation::STATUT_EN_COURS);
        $em->persist($historique);
        $em->flush();

        // ── 4. Traiter chaque ligne ───────────────────────────────────
        $compteurs = [
            'crees'       => 0,
            'mis_a_jour'  => 0,
            'deja_existe' => 0,
            'erreurs'     => 0,
        ];
        $journalErreurs        = [];
        $journalAvertissements = [];

        $categoriesConnues = $this->chargerCategoriesIndexees($em);

        foreach ($rows as $lineIndex => $row) {
            $lineNum = $lineIndex + 1;
            $sku     = trim($row['sku'] ?? '');
            $nom     = trim($row['nom'] ?? '');
            $catNom  = trim($row['categorie'] ?? $row['catégorie'] ?? '');

            // ── Validation obligatoire : SKU + Nom ────────────────────
            if ($sku === '' || $nom === '') {
                $msg = $sku === ''
                    ? 'SKU manquant — ligne ignorée.'
                    : 'Nom du produit manquant — ligne ignorée.';
                $journalErreurs[] = ['ligne' => $lineNum, 'sku' => $sku ?: '—', 'erreur' => $msg];
                $compteurs['erreurs']++;
                continue;
            }

            // ── Catégorie inconnue + skipCategories=true ──────────────
            if ($catNom !== '' && !isset($categoriesConnues[mb_strtolower($catNom)]) && $skipCategories) {
                $journalErreurs[] = [
                    'ligne'  => $lineNum,
                    'sku'    => $sku,
                    'erreur' => "Catégorie « {$catNom} » introuvable — produit ignoré.",
                ];
                $compteurs['erreurs']++;
                continue;
            }

            // ── Vérification URL image (NON BLOQUANTE - simple avertissement) ──
            $imageUrl = trim($row['image_url'] ?? '');
            if ($imageUrl !== '' && !$this->isUrlValide($imageUrl)) {
                $journalAvertissements[] = [
                    'ligne'         => $lineNum,
                    'sku'           => $sku,
                    'avertissement' => "URL image invalide ou inaccessible — produit importé sans image.",
                ];
                $imageUrl = '';
            }

            // ── Description originale vide (NON BLOQUANTE) ────────────
            $descOriginale = trim($row['description_originale'] ?? $row['description'] ?? '');
            if ($descOriginale === '') {
                $journalAvertissements[] = [
                    'ligne'         => $lineNum,
                    'sku'           => $sku,
                    'avertissement' => 'Description originale vide — produit importé sans description.',
                ];
            }

            // ── Statut (défaut : inactif) ─────────────────────────────
            $statutImport = strtolower(trim($row['statut'] ?? 'inactif'));
            if (!in_array($statutImport, ['actif', 'inactif', 'rupture'])) {
                $statutImport = 'inactif';
            }

            // ── Caractéristiques → liste normalisée ───────────────────
            $caracteristiques = $this->normaliserCaracteristiques(
                $row['caracteristiques'] ?? $row['caractéristiques'] ?? null,
                $fixFormat
            );

            // ── Résolution catégorie ───────────────────────────────────
            $categorieEntity = null;
            if ($catNom !== '' && isset($categoriesConnues[mb_strtolower($catNom)])) {
                $categorieEntity = $categoriesConnues[mb_strtolower($catNom)];
            }

            // ── Cherche si le produit existe déjà (par SKU) ───────────
            $produitExistant = $em->getRepository(Produit::class)->findOneBy(['sku' => $sku]);

            $descriptionGenereeFile = trim($row['description_generee'] ?? $row['description_générée'] ?? '');

            try {
                if ($produitExistant) {
                    // ── Produit déjà en base : ON MODIFIE TOUT ────────
                    $ancienStatut = $produitExistant->getStatut();
                    $produitExistant->setNom($nom);
                    $produitExistant->setStatut($statutImport);
                    $produitExistant->setCaracteristiques($caracteristiques);
                    $produitExistant->setDescriptionOriginale($descOriginale ?: null);
                    if ($imageUrl !== '') {
                        $produitExistant->setImageUrl($imageUrl);
                    }
                    if ($categorieEntity) {
                        $produitExistant->setCategorie($categorieEntity);
                    }
                    $produitExistant->setDateModification(new \DateTime());

                    if ($descriptionGenereeFile !== '') {
                        $produitExistant->setDescriptionGeneree($descriptionGenereeFile);
                    } else {
                        try {
                            $resultatIA = $aiProviderManager->genererContenuIA($produitExistant, $aiProvider);
                            $produitExistant->setDescriptionGeneree($resultatIA['description']);
                            if ($resultatIA['imageUrl'] !== null) {
                                $produitExistant->setImageUrl($resultatIA['imageUrl']);
                            }
                            if ($resultatIA['fallback']) {
                                $journalAvertissements[] = [
                                    'ligne' => $lineNum, 'sku' => $sku,
                                    'avertissement' => "Génération IA via {$resultatIA['provider']} (bascule automatique).",
                                ];
                            }
                        } catch (\Throwable $e) {
                            $journalAvertissements[] = [
                                'ligne' => $lineNum, 'sku' => $sku,
                                'avertissement' => 'Génération IA indisponible pour ce produit.',
                            ];
                        }
                    }

                    $journalAvertissements[] = [
                        'ligne'         => $lineNum,
                        'sku'           => $sku,
                        'avertissement' => "Mise à jour : statut changé de « {$ancienStatut} » → « {$statutImport} ».",
                    ];
                    $compteurs['mis_a_jour']++;

                } else {
                    // ── Nouveau produit ───────────────────────────────
                    $produit = new Produit();
                    $produit->setSku($sku);
                    $produit->setNom($nom);
                    $produit->setStatut($statutImport);
                    $produit->setCaracteristiques($caracteristiques);
                    $produit->setDescriptionOriginale($descOriginale ?: null);
                    $produit->setImageUrl($imageUrl ?: null);
                    $produit->setUtilisateur($user);
                    if ($categorieEntity) {
                        $produit->setCategorie($categorieEntity);
                    }

                    if ($descriptionGenereeFile !== '') {
                        $produit->setDescriptionGeneree($descriptionGenereeFile);
                    } else {
                        try {
                            $resultatIA = $aiProviderManager->genererContenuIA($produit, $aiProvider);
                            $produit->setDescriptionGeneree($resultatIA['description']);
                            if ($resultatIA['imageUrl'] !== null) {
                                $produit->setImageUrl($resultatIA['imageUrl']);
                            }
                            if ($resultatIA['fallback']) {
                                $journalAvertissements[] = [
                                    'ligne' => $lineNum, 'sku' => $sku,
                                    'avertissement' => "Génération IA via {$resultatIA['provider']} (bascule automatique).",
                                ];
                            }
                        } catch (\Throwable $e) {
                            $journalAvertissements[] = [
                                'ligne' => $lineNum, 'sku' => $sku,
                                'avertissement' => 'Génération IA indisponible pour ce produit.',
                            ];
                        }
                    }

                    $em->persist($produit);
                    $compteurs['crees']++;
                }

            } catch (\Throwable $e) {
                $journalErreurs[] = [
                    'ligne'  => $lineNum,
                    'sku'    => $sku,
                    'erreur' => $e->getMessage(),
                ];
                $compteurs['erreurs']++;
            }
        }

        // ── 5. Flush ──────────────────────────────────────────────────
        $em->flush();

        // ── 6. Finaliser l'historique ─────────────────────────────────
        $totalImportes = $compteurs['crees'] + $compteurs['mis_a_jour'];
        $totalErreurs  = $compteurs['erreurs'];

        $historique->setNombreImportes($totalImportes);
        $historique->setNombreErreurs($totalErreurs);

        // Fusionne erreurs + avertissements, triés par numéro de ligne
        $toutLesDetails = array_merge(
            array_map(fn($e) => array_merge($e, ['type' => 'erreur']), $journalErreurs),
            array_map(fn($a) => [
                'ligne'  => $a['ligne'],
                'sku'    => $a['sku'],
                'erreur' => $a['avertissement'],
                'type'   => 'avertissement',
            ], $journalAvertissements)
        );
        usort($toutLesDetails, fn($a, $b) => $a['ligne'] <=> $b['ligne']);
        $historique->setDetailErreurs(
            $toutLesDetails ? json_encode($toutLesDetails, JSON_UNESCAPED_UNICODE) : null
        );

        // Statut final de l'historique
        if ($totalImportes === 0 && $totalErreurs === 0 && $compteurs['deja_existe'] > 0) {
            // Tous les produits existaient déjà → SUCCES
            $historique->setStatut(HistoriqueImportation::STATUT_SUCCES);
            $resume = "Tous les produits existaient déjà — aucune modification.";
            $actionResult = 'deja_existe';

        } elseif ($totalImportes === 0 && $totalErreurs > 0) {
            // Aucun produit importé, uniquement des erreurs → ECHEC
            $historique->setStatut(HistoriqueImportation::STATUT_ECHEC);
            $resume = "Échec total : aucun produit importé, {$totalErreurs} erreur(s).";
            $actionResult = 'echec';

        } elseif ($totalErreurs > 0) {
            // PARTIEL : il y a des erreurs (produits ignorés) ET des produits importés ou mis à jour
            $historique->setStatut(HistoriqueImportation::STATUT_PARTIEL);
            $resume = "{$compteurs['crees']} créé(s), {$compteurs['mis_a_jour']} mis à jour, "
                    . "{$compteurs['deja_existe']} déjà existant(s), {$totalErreurs} erreur(s).";
            $actionResult = 'partiel';

        } elseif (!empty($journalAvertissements)) {
            // SUCCES AVEC AVERTISSEMENTS (non bloquants) → NOUVEAU STATUT !
            $historique->setStatut(HistoriqueImportation::STATUT_SUCCES_AVEC_WARNINGS);
            $resume = "{$compteurs['crees']} produit(s) créé(s) avec succès (avec avertissements non bloquants).";
            $actionResult = 'succes_avec_warnings';

        } else {
            // SUCCES TOTAL : aucun avertissement, aucune erreur
            $historique->setStatut(HistoriqueImportation::STATUT_SUCCES);
            $resume = "{$compteurs['crees']} produit(s) créé(s) avec succès.";
            $actionResult = 'succes';
        }

        $historique->setMessageResume($resume);
        $em->flush();

        // ── 7. Réponse JSON ───────────────────────────────────────────
        return new JsonResponse([
            'action'         => $actionResult,
            'message'        => $resume,
            'compteurs'      => $compteurs,
            'avertissements' => $journalAvertissements,
            'erreurs'        => $journalErreurs,
            'totalImportes'  => $totalImportes,
            'totalErreurs'   => $totalErreurs,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  TEMPLATE D'IMPORT (téléchargeable)
    // ══════════════════════════════════════════════════════════════════

    #[Route('/import/template', name: 'app_produit_import_template', methods: ['GET'])]
    public function downloadImportTemplate(Request $request): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $format = $request->query->get('format', 'csv');

        // En-têtes avec 2 lignes d'exemple
        $headers = ['sku', 'nom', 'categorie', 'statut', 'caracteristiques', 'description_originale', 'image_url'];

        return $format === 'excel'
            ? $this->genererTemplateExcel($headers)
            : $this->genererTemplateCsv($headers);
    }

    private function genererTemplateCsv(array $headers): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($headers) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, $headers, ';');

            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="template_import_produits.csv"');
        return $response;
    }

    private function genererTemplateExcel(array $headers): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($headers) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, $headers, "\t");
            
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="template_import_produits.xls"');
        return $response;
    }

    // ══════════════════════════════════════════════════════════════════
    //  CRÉATION DE CATÉGORIE (AJAX)
    // ══════════════════════════════════════════════════════════════════

    #[Route('/import/create-category', name: 'app_produit_import_create_category', methods: ['POST'])]
    public function createCategoryForImport(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true);
        $nom  = trim($data['nom'] ?? '');

        if ($nom === '') {
            return new JsonResponse(['success' => false, 'message' => 'Nom vide.'], 400);
        }

        $existing = $em->getRepository(Categorie::class)
            ->createQueryBuilder('c')
            ->where('LOWER(c.nom) = LOWER(:nom)')
            ->setParameter('nom', $nom)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($existing) {
            return new JsonResponse([
                'success' => true,
                'message' => 'Catégorie déjà existante.',
                'id'      => $existing->getId(),
            ]);
        }

        $categorie = new Categorie();
        $categorie->setNom($nom);
        $categorie->setUtilisateur($this->getUser());
        $em->persist($categorie);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'message' => "Catégorie « {$nom} » créée avec succès.",
            'id'      => $categorie->getId(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  HELPERS IMPORT
    // ══════════════════════════════════════════════════════════════════

    private function chargerCategoriesIndexees(EntityManagerInterface $em): array
    {
        $result = [];
        foreach ($em->getRepository(Categorie::class)->findAll() as $cat) {
            $result[mb_strtolower($cat->getNom())] = $cat;
        }
        return $result;
    }

    private function detecterCategoriesInconnues(array $rows, array $categoriesConnues): array
    {
        $inconnues = [];
        foreach ($rows as $row) {
            $catNom = trim($row['categorie'] ?? $row['catégorie'] ?? '');
            if ($catNom !== '' && !isset($categoriesConnues[mb_strtolower($catNom)])) {
                $inconnues[mb_strtolower($catNom)] = $catNom;
            }
        }
        return $inconnues;
    }

    private function isUrlValide(string $url): bool
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        $context = stream_context_create(['http' => [
            'method'          => 'HEAD',
            'timeout'         => 3,
            'ignore_errors'   => true,
            'follow_location' => true,
        ]]);
        $headers = @get_headers($url, false, $context);
        if (!$headers) {
            return false;
        }
        return (bool) preg_match('/^HTTP\/\d\.?\d?\s+[23]\d\d/', $headers[0]);
    }

    private function normaliserCaracteristiques(mixed $value, bool $autoFix = false): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value)) {
            $items = array_map('trim', $value);
            $items = array_filter($items, fn($i) => $i !== '');
            return implode("\n", $items) ?: null;
        }

        $str = str_replace(["\r\n", "\r"], "\n", (string) $value);
        $str = trim($str);
        if ($str === '') {
            return null;
        }

        if ($autoFix && !str_contains($str, "\n") && preg_match('/[,;]/', $str)) {
            $lines = preg_split('/[,;]+/', $str);
        } else {
            $lines = explode("\n", $str);
        }

        $lines = array_map('trim', $lines);
        $lines = array_filter($lines, fn($l) => $l !== '');

        return implode("\n", $lines) ?: null;
    }

    private function detecterCaracteristiquesIncompatibles(array $rows): array
    {
        $problemes = [];
        foreach ($rows as $index => $row) {
            $valeur = $row['caracteristiques'] ?? $row['caractéristiques'] ?? null;

            if ($valeur === null || is_array($valeur)) {
                continue;
            }

            $str = trim(str_replace(["\r\n", "\r"], "\n", (string) $valeur));
            if ($str === '' || str_contains($str, "\n")) {
                continue;
            }

            if (preg_match('/[,;]/', $str)) {
                $problemes[] = [
                    'ligne'  => $index + 1,
                    'sku'    => trim($row['sku'] ?? '—'),
                    'valeur' => $str,
                ];
            }
        }
        return $problemes;
    }

    private function creerHistoriqueEchec(
        EntityManagerInterface $em,
        string $nomFichier,
        string $format,
        string $messageErreur
    ): void {
        $historique = new HistoriqueImportation();
        $historique->setNomFichier($nomFichier);
        $historique->setFormatFichier($format);
        $historique->setUser($this->getUser());
        $historique->setNombreLignes(0);
        $historique->setNombreImportes(0);
        $historique->setNombreErreurs(1);
        $historique->setStatut(HistoriqueImportation::STATUT_ECHEC);
        $historique->setMessageResume($messageErreur);
        $historique->setDetailErreurs(json_encode([
            ['ligne' => 0, 'sku' => '—', 'erreur' => $messageErreur, 'type' => 'erreur'],
        ]));
        $em->persist($historique);
        $em->flush();
    }

    // ══════════════════════════════════════════════════════════════════
    //  PARSEURS
    // ══════════════════════════════════════════════════════════════════

    private function parseJson(string $path): array
    {
        $content = file_get_contents($path);
        if ($content === false) {
            throw new \RuntimeException('Impossible de lire le fichier JSON.');
        }

        $data = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Fichier JSON invalide : ' . json_last_error_msg());
        }

        if (isset($data['produits']) && is_array($data['produits'])) {
            $rows = $data['produits'];
        } elseif (is_array($data) && array_is_list($data)) {
            $rows = $data;
        } else {
            throw new \RuntimeException(
                'Structure JSON invalide. Attendu : {"produits":[...]} ou un tableau direct [...].'
            );
        }

        return $rows;
    }

    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier CSV.');
        }

        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $firstLine = fgets($handle);
        rewind($handle);
        if ($bom === "\xEF\xBB\xBF") {
            fread($handle, 3);
        }
        $sep = substr_count($firstLine, ';') >= substr_count($firstLine, ',') ? ';' : ',';

        $headers = fgetcsv($handle, 0, $sep);
        if (!$headers) {
            fclose($handle);
            throw new \RuntimeException('Le fichier CSV est vide ou mal formé.');
        }
        $headers = array_map(
            fn($h) => $this->normalizeHeader(trim(preg_replace('/[\x{FEFF}]/u', '', $h))),
            $headers
        );

        $rows = [];
        while (($values = fgetcsv($handle, 0, $sep)) !== false) {
            if (count(array_filter($values, fn($v) => trim($v) !== '')) === 0) {
                continue;
            }
            $row = [];
            foreach ($headers as $i => $h) {
                $row[$h] = $values[$i] ?? '';
            }
            $rows[] = $row;
        }

        fclose($handle);
        return $rows;
    }

    private function parseExcel(string $path): array
    {
        if (class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
            $sheet       = $spreadsheet->getActiveSheet();
            $allRows     = $sheet->toArray(null, true, true, false);

            if (empty($allRows)) {
                throw new \RuntimeException('Le fichier Excel est vide.');
            }

            $headers = array_map(
                fn($h) => $this->normalizeHeader((string) ($h ?? '')),
                array_shift($allRows)
            );

            $rows = [];
            foreach ($allRows as $values) {
                if (empty(array_filter($values, fn($v) => $v !== null && $v !== ''))) {
                    continue;
                }
                $row = [];
                foreach ($headers as $i => $h) {
                    $row[$h] = str_replace(["\r\n", "\r"], "\n", (string) ($values[$i] ?? ''));
                }
                $rows[] = $row;
            }
            return $rows;
        }

        if (class_exists('\ZipArchive')) {
            $zip = new \ZipArchive();
            if ($zip->open($path) === true) {
                $sharedStrings = [];
                $ssXml = $zip->getFromName('xl/sharedStrings.xml');
                if ($ssXml !== false) {
                    $ssDoc = new \SimpleXMLElement($ssXml);
                    $ssDoc->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
                    foreach ($ssDoc->xpath('//x:si') as $si) {
                        $text = '';
                        foreach ($si->xpath('.//x:t') as $t) {
                            $text .= (string) $t;
                        }
                        $sharedStrings[] = str_replace(["\r\n", "\r"], "\n", $text);
                    }
                }
                $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
                $zip->close();
                if ($sheetXml !== false) {
                    return $this->parseXlsxSheet($sheetXml, $sharedStrings);
                }
            }
        }

        $content = file_get_contents($path);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        if (str_contains($content, "\t")) {
            $lines   = explode("\n", trim($content));
            $headers = array_map(
                fn($h) => $this->normalizeHeader(trim($h)),
                str_getcsv(array_shift($lines), "\t")
            );
            $rows = [];
            foreach ($lines as $line) {
                if (trim($line) === '') continue;
                $values = str_getcsv($line, "\t");
                $row    = [];
                foreach ($headers as $i => $h) {
                    $row[$h] = isset($values[$i]) ? trim($values[$i]) : '';
                }
                $rows[] = $row;
            }
            return $rows;
        }

        throw new \RuntimeException(
            'Impossible de lire ce fichier Excel sans PhpSpreadsheet. '
            . 'Installez-le : composer require phpoffice/phpspreadsheet'
        );
    }

    private function parseXlsxSheet(string $sheetXml, array $sharedStrings): array
    {
        $doc = new \SimpleXMLElement($sheetXml);
        $doc->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $allRows = [];
        foreach ($doc->xpath('//x:row') as $rowNode) {
            $rowData = [];
            foreach ($rowNode->xpath('x:c') as $cell) {
                $type  = (string) ($cell['t'] ?? '');
                $value = (string) ($cell->v ?? '');
                if ($type === 's') {
                    $value = $sharedStrings[(int) $value] ?? '';
                } elseif ($type === 'inlineStr') {
                    $value = (string) ($cell->is->t ?? '');
                }
                $colRef  = preg_replace('/[0-9]/', '', (string) $cell['r']);
                $colIdx  = $this->colLetterToIndex($colRef);
                $rowData[$colIdx] = str_replace(["\r\n", "\r"], "\n", $value);
            }
            ksort($rowData);
            $allRows[] = array_values($rowData);
        }

        if (empty($allRows)) return [];

        $headers = array_map(
            fn($h) => $this->normalizeHeader(trim((string) $h)),
            array_shift($allRows)
        );

        $rows = [];
        foreach ($allRows as $values) {
            if (count(array_filter($values, fn($v) => trim((string) $v) !== '')) === 0) continue;
            $row = [];
            foreach ($headers as $i => $h) {
                $row[$h] = isset($values[$i]) ? (string) $values[$i] : '';
            }
            $rows[] = $row;
        }
        return $rows;
    }

    private function colLetterToIndex(string $col): int
    {
        $col   = strtoupper($col);
        $index = 0;
        for ($i = 0; $i < strlen($col); $i++) {
            $index = $index * 26 + (ord($col[$i]) - 64);
        }
        return $index - 1;
    }

    private function normalizeHeader(string $header): string
    {
        $h = mb_strtolower(trim($header));
        $h = preg_replace('/[\x{FEFF}]/u', '', $h);
        $h = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $h) ?: $h;
        $h = preg_replace('/[^a-z0-9_]/', '_', $h);
        $h = trim($h, '_');
        $h = preg_replace('/_+/', '_', $h);

        return match ($h) {
            'nom_du_produit', 'name', 'produit', 'product_name', 'libelle'          => 'nom',
            'categorie', 'category', 'cat', 'cat_gorie'                              => 'categorie',
            'stock_keeping_unit', 'ref', 'reference'                                 => 'sku',
            'statut', 'status', 'etat', 'state'                                      => 'statut',
            'caracteristiques', 'caracteristique', 'features',
            'caract_ristiques', 'caract_ristique'                                    => 'caracteristiques',
            'description_originale', 'description', 'desc'                           => 'description_originale',
            'description_generee', 'description_ia', 'desc_ia',
            'description_g_n_r_e', 'description_gen_r_e'                            => 'description_generee',
            'image_url', 'image', 'url_image', 'photo', 'url'                       => 'image_url',
            default                                                                   => $h,
        };
    }

    // ══════════════════════════════════════════════════════════════════
    //  EXPORT
    // ══════════════════════════════════════════════════════════════════

    #[Route('/export', name: 'app_produit_export', methods: ['GET'])]
    public function export(EntityManagerInterface $em, Request $request): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $statut      = $request->query->get('statut', '');
        $categorieId = $request->query->get('categorie', '');
        $search      = $request->query->get('search', '');
        $format      = $request->query->get('format', 'csv');

        $qb = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->leftJoin('p.categorie', 'c')
            ->leftJoin('p.utilisateur', 'u')
            ->orderBy('p.dateCreation', 'DESC');

        if ($statut)      $qb->andWhere('p.statut = :statut')->setParameter('statut', $statut);
        if ($categorieId) $qb->andWhere('c.id = :cat')->setParameter('cat', $categorieId);
        if ($search)      $qb->andWhere('p.nom LIKE :s OR p.sku LIKE :s')->setParameter('s', '%' . $search . '%');

        $produits = $qb->getQuery()->getResult();

        return match ($format) {
            'excel' => $this->exportExcel($produits),
            'json'  => $this->exportJson($produits),
            'pdf'   => $this->exportPdf($produits),
            default => $this->exportCsv($produits),
        };
    }

    private function exportCsv(array $produits): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($produits) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, [
                'sku', 'nom', 'categorie', 'statut', 'caracteristiques',
                'description_originale', 'description_generee', 'image_url',
                'cree_par', 'date_creation', 'date_modification',
            ], ';');
            foreach ($produits as $p) {
                fputcsv($handle, [
                    $p->getSku(),
                    $p->getNom(),
                    $p->getCategorie()?->getNom() ?? '',
                    $p->getStatut(),
                    $p->getCaracteristiques() ?? '',
                    $p->getDescriptionOriginale() ?? '',
                    $p->getDescriptionGeneree() ?? '',
                    $p->getImageUrl() ?? '',
                    trim(($p->getUtilisateur()?->getPrenom() ?? '') . ' ' . ($p->getUtilisateur()?->getNom() ?? '')),
                    $p->getDateCreation()?->format('d/m/Y H:i'),
                    $p->getDateModification()?->format('d/m/Y H:i') ?? '',
                ], ';');
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="produits_' . date('Y-m-d_His') . '.csv"');
        return $response;
    }

    private function exportExcel(array $produits): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($produits) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, [
                'sku', 'nom', 'categorie', 'statut', 'caracteristiques',
                'description_originale', 'description_generee', 'image_url',
                'cree_par', 'date_creation', 'date_modification',
            ], "\t");
            foreach ($produits as $p) {
                fputcsv($handle, [
                    $p->getSku(),
                    $p->getNom(),
                    $p->getCategorie()?->getNom() ?? '',
                    $p->getStatut(),
                    $p->getCaracteristiques() ?? '',
                    $p->getDescriptionOriginale() ?? '',
                    $p->getDescriptionGeneree() ?? '',
                    $p->getImageUrl() ?? '',
                    trim(($p->getUtilisateur()?->getPrenom() ?? '') . ' ' . ($p->getUtilisateur()?->getNom() ?? '')),
                    $p->getDateCreation()?->format('d/m/Y H:i'),
                    $p->getDateModification()?->format('d/m/Y H:i') ?? '',
                ], "\t");
            }
            fclose($handle);
        });
        $response->headers->set('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="produits_' . date('Y-m-d_His') . '.xls"');
        return $response;
    }

    private function exportJson(array $produits): Response
    {
        $data = array_map(fn(Produit $p) => [
            'sku'                   => $p->getSku(),
            'nom'                   => $p->getNom(),
            'categorie'             => $p->getCategorie()?->getNom(),
            'statut'                => $p->getStatut(),
            'caracteristiques'      => $p->getCaracteristiques()
                ? array_values(array_filter(
                    array_map('trim', explode("\n", $p->getCaracteristiques())),
                    fn($l) => $l !== ''
                ))
                : [],
            'description_originale' => $p->getDescriptionOriginale(),
            'description_generee'   => $p->getDescriptionGeneree(),
            'image_url'             => $p->getImageUrl(),
            'cree_par'              => trim(($p->getUtilisateur()?->getPrenom() ?? '') . ' ' . ($p->getUtilisateur()?->getNom() ?? '')),
            'date_creation'         => $p->getDateCreation()?->format('Y-m-d H:i:s'),
            'date_modification'     => $p->getDateModification()?->format('Y-m-d H:i:s'),
        ], $produits);

        $json = json_encode([
            'exported_at' => (new \DateTime())->format('Y-m-d H:i:s'),
            'total'       => count($data),
            'produits'    => $data,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return new Response($json, 200, [
            'Content-Type'        => 'application/json; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="produits_' . date('Y-m-d_His') . '.json"',
        ]);
    }

    private function exportPdf(array $produits): Response
    {
        $date  = (new \DateTime())->format('d/m/Y H:i');
        $total = count($produits);
        $rows  = '';
        foreach ($produits as $p) {
            $color = match ($p->getStatut()) {
                'actif'   => '#28a745',
                'rupture' => '#dc3545',
                default   => '#6c757d',
            };
            $rows .= sprintf(
                '<tr><td style="font-family:monospace;color:#00cc82;">%s</td><td>%s</td>
                      <td>%s</td><td><span style="color:%s;font-weight:600;">%s</span></td><td>%s</td></tr>',
                htmlspecialchars($p->getSku()),
                htmlspecialchars($p->getNom()),
                htmlspecialchars($p->getCategorie()?->getNom() ?? '—'),
                $color,
                ucfirst($p->getStatut()),
                $p->getDateCreation()?->format('d/m/Y') ?? '—'
            );
        }
        $html = <<<HTML
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Export — NOVAWIN</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#0b1329;color:#c9d6f0;padding:32px}
h1{font-size:1.4rem;font-weight:700;color:#00ffa3;margin-bottom:4px}.meta{font-size:.8rem;color:#7a8cb0;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:.85rem}thead tr{background:#131e35}
thead th{padding:10px 14px;text-align:left;color:#7a8cb0;font-size:.7rem;text-transform:uppercase;letter-spacing:1px}
tbody tr{border-bottom:1px solid #1e2d4a}tbody td{padding:10px 14px}
@media print{body{background:#fff;color:#111}h1{color:#00995e}thead tr{background:#f0f4f8}tbody tr{border-bottom:1px solid #dde3ed}}
</style></head><body><h1>📦 Catalogue Produits — NOVAWIN</h1>
<p class="meta">Exporté le {$date} · {$total} produit(s)</p>
<table><thead><tr><th>SKU</th><th>Nom</th><th>Catégorie</th><th>Statut</th><th>Date création</th></tr></thead>
<tbody>{$rows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>
HTML;
        return new Response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    // ══════════════════════════════════════════════════════════════════
    //  CRUD STANDARD
    // ══════════════════════════════════════════════════════════════════

    #[Route('/new', name: 'app_produit_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $em, AiProviderManager $aiProviderManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $produit = new Produit();
        $produit->setUtilisateur($this->getUser());
        $form = $this->createForm(ProduitType::class, $produit);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {

            $aiProvider = $request->getSession()->get('ai_provider', 'gemini');
            try {
                $resultat = $aiProviderManager->genererContenuIA($produit, $aiProvider);
                $produit->setDescriptionGeneree($resultat['description']);
                if ($resultat['imageUrl'] !== null) {
                    $produit->setImageUrl($resultat['imageUrl']);
                }
                if ($resultat['fallback']) {
                    $this->addFlash('success', "Produit créé (génération IA via {$resultat['provider']}, bascule automatique).");
                }
            } catch (\Throwable $e) {
                $this->addFlash('error', 'La génération IA a échoué (produit tout de même enregistré) : ' . $e->getMessage());
            }

            $em->persist($produit);
            $em->flush();
            $this->addFlash('success', 'Le produit a été créé avec succès.');
            return $this->redirectToRoute('app_produit_index');
        }

        if ($form->isSubmitted() && !$form->isValid()) {
            $errors = [];
            foreach ($form->getErrors(true) as $error) {
                $errors[] = $error->getMessage();
            }
            $this->addFlash('error', implode('|', $errors));
        }

        return $this->render('produit/new.html.twig', ['form' => $form->createView()]);
    }

    #[Route('/{id}/edit', name: 'app_produit_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Produit $produit, EntityManagerInterface $em, AiProviderManager $aiProviderManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $form = $this->createForm(ProduitType::class, $produit);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {

            if ($request->request->get('regenererIA') === '1') {
                $aiProvider = $request->getSession()->get('ai_provider', 'gemini');
                try {
                    $resultat = $aiProviderManager->genererContenuIA($produit, $aiProvider);
                    $produit->setDescriptionGeneree($resultat['description']);
                    if ($resultat['imageUrl'] !== null) {
                        $produit->setImageUrl($resultat['imageUrl']);
                    }
                    if ($resultat['fallback']) {
                        $this->addFlash('success', "Régénéré via {$resultat['provider']} (bascule automatique).");
                    }
                } catch (\Throwable $e) {
                    $this->addFlash('error', 'La génération IA a échoué (modifications tout de même enregistrées) : ' . $e->getMessage());
                }
            }

            $produit->setDateModification(new \DateTime());
            $em->flush();
            $this->addFlash('success', 'Le produit a été modifié avec succès.');
            return $this->redirectToRoute('app_produit_index');
        }

        if ($form->isSubmitted() && !$form->isValid()) {
            $errors = [];
            foreach ($form->getErrors(true) as $error) {
                $errors[] = $error->getMessage();
            }
            $this->addFlash('error', implode('|', $errors));
        }

        return $this->render('produit/edit.html.twig', ['form' => $form->createView(), 'produit' => $produit]);
    }

    #[Route('/{id}/delete', name: 'app_produit_delete', methods: ['POST'])]
    public function delete(Request $request, Produit $produit, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        if ($this->isCsrfTokenValid('delete' . $produit->getId(), $request->request->get('_token'))) {
            $em->remove($produit);
            $em->flush();
            $this->addFlash('success', 'Le produit a été supprimé avec succès.');
        }
        return $this->redirectToRoute('app_produit_index');
    }

    #[Route('/{id}/show', name: 'app_produit_show', methods: ['GET'])]
    public function show(Produit $produit): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        return $this->render('produit/show.html.twig', ['produit' => $produit]);
    }
}
