<?php

namespace App\Controller;

use App\Entity\Produit;
use App\Entity\Categorie;
use App\Form\ProduitType;
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
    #[Route('/', name: 'app_produit_index', methods: ['GET'])]
    public function index(
        EntityManagerInterface $em,
        PaginatorInterface $paginator,
        Request $request
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $categories = $em->getRepository(Categorie::class)->findBy([], ['nom' => 'ASC']);

        $query = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->leftJoin('p.categorie', 'c')
            ->leftJoin('p.utilisateur', 'u')
            ->orderBy('p.dateCreation', 'DESC')
            ->getQuery();

        $produits = $paginator->paginate(
            $query,
            $request->query->getInt('page', 1),
            10
        );

        return $this->render('produit/index.html.twig', [
            'produits'   => $produits,
            'categories' => $categories,
        ]);
    }

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

        if ($statut) {
            $qb->andWhere('p.statut = :statut')->setParameter('statut', $statut);
        }
        if ($categorieId) {
            $qb->andWhere('c.id = :cat')->setParameter('cat', $categorieId);
        }
        if ($search) {
            $qb->andWhere('p.nom LIKE :search OR p.sku LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        $produits = $qb->getQuery()->getResult();

        return match ($format) {
            'excel' => $this->exportExcel($produits),
            'json'  => $this->exportJson($produits),
            'pdf'   => $this->exportPdf($produits),
            default => $this->exportCsv($produits),
        };
    }

    // ─── CSV ────────────────────────────────────────────────────────────────
    private function exportCsv(array $produits): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($produits) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'SKU', 'Nom', 'Catégorie', 'Statut',
                'Caractéristiques', 'Description Originale',
                'Description Générée', 'URL Image',
                'Créé par', 'Date Création', 'Date Modification'
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

        $filename = 'produits_' . date('Y-m-d_His') . '.csv';
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    // ─── EXCEL (TSV) ────────────────────────────────────────────────────────
    private function exportExcel(array $produits): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($produits) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'SKU', 'Nom', 'Catégorie', 'Statut',
                'Caractéristiques', 'Description Originale',
                'Description Générée', 'URL Image',
                'Créé par', 'Date Création', 'Date Modification'
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

        $filename = 'produits_' . date('Y-m-d_His') . '.xls';
        $response->headers->set('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    // ─── JSON ───────────────────────────────────────────────────────────────
    private function exportJson(array $produits): Response
    {
        $data = array_map(fn(Produit $p) => [
            'sku'                   => $p->getSku(),
            'nom'                   => $p->getNom(),
            'categorie'             => $p->getCategorie()?->getNom(),
            'statut'                => $p->getStatut(),
            'caracteristiques'      => $p->getCaracteristiques(),
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

        $filename = 'produits_' . date('Y-m-d_His') . '.json';

        return new Response($json, 200, [
            'Content-Type'        => 'application/json; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    // ─── PDF (HTML → navigateur imprime) ────────────────────────────────────
    private function exportPdf(array $produits): Response
    {
        $date  = (new \DateTime())->format('d/m/Y H:i');
        $total = count($produits);

        $rows = '';
        foreach ($produits as $p) {
            $statutColor = match ($p->getStatut()) {
                'actif'   => '#28a745',
                'rupture' => '#dc3545',
                default   => '#6c757d',
            };
            $rows .= sprintf(
                '<tr>
                    <td style="font-family:monospace;color:#00cc82;">%s</td>
                    <td>%s</td>
                    <td>%s</td>
                    <td><span style="color:%s;font-weight:600;">%s</span></td>
                    <td>%s</td>
                </tr>',
                htmlspecialchars($p->getSku()),
                htmlspecialchars($p->getNom()),
                htmlspecialchars($p->getCategorie()?->getNom() ?? '—'),
                $statutColor,
                ucfirst($p->getStatut()),
                $p->getDateCreation()?->format('d/m/Y') ?? '—'
            );
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Export Produits — NOVAWIN</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0b1329; color: #c9d6f0; padding: 32px; }
  h1 { font-size: 1.4rem; font-weight: 700; color: #00ffa3; margin-bottom: 4px; }
  .meta { font-size: 0.8rem; color: #7a8cb0; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  thead tr { background: #131e35; }
  thead th { padding: 10px 14px; text-align: left; color: #7a8cb0;
             font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; }
  tbody tr { border-bottom: 1px solid #1e2d4a; }
  tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
  tbody td { padding: 10px 14px; }
  @media print {
    body { background: white; color: #111; padding: 16px; }
    h1 { color: #00995e; }
    thead tr { background: #f0f4f8; }
    tbody tr { border-bottom: 1px solid #dde3ed; }
  }
</style>
</head>
<body>
<h1>📦 Catalogue Produits — NOVAWIN</h1>
<p class="meta">Exporté le {$date} · {$total} produit(s)</p>
<table>
  <thead>
    <tr>
      <th>SKU</th><th>Nom</th><th>Catégorie</th><th>Statut</th><th>Date création</th>
    </tr>
  </thead>
  <tbody>{$rows}</tbody>
</table>
<script>window.onload = () => window.print();</script>
</body>
</html>
HTML;

        return new Response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    // ─── IMPORT ──────────────────────────────────────────────────────────────
    #[Route('/import', name: 'app_produit_import', methods: ['POST'])]
    public function import(Request $request, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $file = $request->files->get('importFile');
        if (!$file) {
            $this->addFlash('error', 'Aucun fichier reçu.');
            return $this->redirectToRoute('app_produit_index');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $imported  = 0;
        $flashErrors = [];

        try {
            $items = match ($extension) {
                'json'        => $this->parseJson($file->getPathname()),
                'csv'         => $this->parseCsv($file->getPathname()),
                'xlsx', 'xls' => $this->parseExcel($file->getPathname()),
                default       => throw new \InvalidArgumentException(
                    "Format « {$extension} » non supporté. Utilisez CSV, Excel (.xlsx/.xls) ou JSON."
                ),
            };

            foreach ($items as $index => $item) {
                try {
                    $produit = new Produit();
                    $produit->setSku(trim($item['sku'] ?? '') ?: uniqid('SKU-'));
                    $produit->setNom(trim($item['nom'] ?? '') ?: 'Sans nom');
                    $produit->setStatut(
                        in_array($item['statut'] ?? '', ['actif', 'inactif', 'rupture'], true)
                            ? $item['statut']
                            : 'inactif'
                    );
                    $produit->setCaracteristiques(!empty($item['caracteristiques']) ? $item['caracteristiques'] : null);
                    $produit->setDescriptionOriginale(!empty($item['description_originale']) ? $item['description_originale'] : null);
                    $produit->setDescriptionGeneree(!empty($item['description_generee']) ? $item['description_generee'] : null);
                    $produit->setImageUrl(!empty($item['image_url']) ? $item['image_url'] : null);
                    $produit->setUtilisateur($this->getUser());

                    if (!empty($item['categorie'])) {
                        $categorie = $em->getRepository(Categorie::class)
                            ->findOneBy(['nom' => trim($item['categorie'])]);
                        if ($categorie) {
                            $produit->setCategorie($categorie);
                        }
                    }

                    $em->persist($produit);
                    $imported++;

                } catch (\Throwable $e) {
                    $flashErrors[] = 'Ligne ' . ($index + 2) . ' ignorée : ' . $e->getMessage();
                }
            }

            $em->flush();

        } catch (\InvalidArgumentException $e) {
            $this->addFlash('error', $e->getMessage());
            return $this->redirectToRoute('app_produit_index');
        } catch (\Throwable $e) {
            $this->addFlash('error', 'Erreur lors de la lecture du fichier : ' . $e->getMessage());
            return $this->redirectToRoute('app_produit_index');
        }

        if ($imported > 0) {
            $this->addFlash('success', "{$imported} produit(s) importé(s) avec succès.");
        }
        foreach ($flashErrors as $err) {
            $this->addFlash('error', $err);
        }
        if ($imported === 0 && empty($flashErrors)) {
            $this->addFlash('error', 'Aucun produit trouvé dans le fichier.');
        }

        return $this->redirectToRoute('app_produit_index');
    }

    // ─── Parseur JSON ────────────────────────────────────────────────────────
    private function parseJson(string $path): array
    {
        $content = file_get_contents($path);
        $data    = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('JSON invalide : ' . json_last_error_msg());
        }

        if (isset($data['produits']) && is_array($data['produits'])) {
            return $data['produits'];
        }

        if (array_is_list($data)) {
            return $data;
        }

        return [$data];
    }

    // ─── Parseur CSV ─────────────────────────────────────────────────────────
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier CSV.');
        }

        // Ignore le BOM UTF-8 si présent
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Détecte le délimiteur automatiquement (point-virgule ou virgule)
        $firstLine = fgets($handle);
        rewind($handle);
        if ($bom === "\xEF\xBB\xBF") {
            fread($handle, 3);
        }
        $delimiter = substr_count($firstLine, ';') >= substr_count($firstLine, ',') ? ';' : ',';

        $headers = fgetcsv($handle, 0, $delimiter);
        if (!$headers) {
            fclose($handle);
            throw new \RuntimeException('Le fichier CSV est vide ou mal formaté.');
        }
        $headers = array_map(fn($h) => $this->normalizeHeader(trim($h)), $headers);

        $items = [];
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (count($row) === count($headers)) {
                $items[] = array_combine($headers, $row);
            }
        }

        fclose($handle);
        return $items;
    }

    // ─── Parseur Excel ───────────────────────────────────────────────────────
    private function parseExcel(string $path): array
    {
        if (!class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
            throw new \RuntimeException(
                'PhpSpreadsheet n\'est pas installé. Exécutez : composer require phpoffice/phpspreadsheet'
            );
        }

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $sheet       = $spreadsheet->getActiveSheet();
        $rows        = $sheet->toArray(null, true, true, false);

        if (empty($rows)) {
            throw new \RuntimeException('Le fichier Excel est vide.');
        }

        $headers = array_map(
            fn($h) => $this->normalizeHeader((string) $h),
            array_shift($rows)
        );

        $items = [];
        foreach ($rows as $row) {
            if (empty(array_filter($row, fn($v) => $v !== null && $v !== ''))) {
                continue; // ignore lignes vides
            }
            if (count($row) === count($headers)) {
                $items[] = array_combine($headers, array_map('strval', $row));
            }
        }

        return $items;
    }

    // ─── Normalisation des en-têtes ──────────────────────────────────────────
    private function normalizeHeader(string $header): string
    {
        $header = mb_strtolower(trim($header));
        $header = iconv('UTF-8', 'ASCII//TRANSLIT', $header) ?: $header;
        $header = preg_replace('/[^a-z0-9_]/', '_', $header);
        $header = trim($header, '_');

        return match ($header) {
            'nom_du_produit', 'name', 'produit', 'product_name' => 'nom',
            'categorie', 'category', 'cat'                       => 'categorie',
            'stock_keeping_unit'                                  => 'sku',
            'statut', 'status', 'etat', 'state'                  => 'statut',
            'caracteristiques', 'caracteristique', 'features'    => 'caracteristiques',
            'description_originale', 'description'               => 'description_originale',
            'description_generee', 'description_ia', 'desc_ia'  => 'description_generee',
            'image_url', 'image', 'url_image', 'photo'           => 'image_url',
            default                                               => $header,
        };
    }

    // ─── CRUD standard ──────────────────────────────────────────────────────
    #[Route('/new', name: 'app_produit_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $produit = new Produit();
        $produit->setUtilisateur($this->getUser());

        $form = $this->createForm(ProduitType::class, $produit);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
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
    public function edit(Request $request, Produit $produit, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $form = $this->createForm(ProduitType::class, $produit);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
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

        return $this->render('produit/edit.html.twig', [
            'form'    => $form->createView(),
            'produit' => $produit,
        ]);
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
