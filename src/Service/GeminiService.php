<?php

namespace App\Service;

use App\Entity\Produit;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class GeminiService
{
    private const MODEL_TEXTE = 'gemini-3.5-flash';
    private const MODEL_IMAGE = 'gemini-3.1-flash-image';
    private const BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct(
        private HttpClientInterface $client,
        private string $apiKey,
        private string $uploadDir
    ) {}

    /**
     * Point d'entrée : détecte le cas et retourne
     * ['description' => string, 'imageUrl' => ?string]
     */
    public function genererContenuIA(Produit $produit): array
    {
        $nom              = $produit->getNom();
        $categorie        = $produit->getCategorie()?->getNom() ?? '';
        $caracteristiques = $produit->getCaracteristiques() ?? '';
        $descriptionOrig  = trim($produit->getDescriptionOriginale() ?? '');
        $imageUrl         = trim($produit->getImageUrl() ?? '');

        $imageData = $imageUrl !== '' ? $this->telechargerImage($imageUrl) : null;
        $hasImage  = $imageData !== null;
        $hasDesc   = $descriptionOrig !== '';

        if ($hasImage && $hasDesc) {
            // CAS 1
            $description   = $this->ameliorerDescription($nom, $categorie, $caracteristiques, $descriptionOrig, $imageData);
            $nouvelleImage = null;

        } elseif ($hasImage && !$hasDesc) {
            // CAS 2
            $description   = $this->genererDescription($nom, $categorie, $caracteristiques, $imageData);
            $nouvelleImage = null;

        } elseif (!$hasImage && $hasDesc) {
            // CAS 3
            $description   = $this->ameliorerDescription($nom, $categorie, $caracteristiques, $descriptionOrig, null);
            $nouvelleImage = $this->genererImage($nom, $categorie, $caracteristiques, $description);

        } else {
            // CAS 4
            $description   = $this->genererDescription($nom, $categorie, $caracteristiques, null);
            $nouvelleImage = $this->genererImage($nom, $categorie, $caracteristiques, $description);
        }

        return ['description' => $description, 'imageUrl' => $nouvelleImage];
    }

    // ══════════════════════════════════════════════════════════
    //  TEXTE — amélioration (CAS 1 & 3)
    // ══════════════════════════════════════════════════════════
    private function ameliorerDescription(
        string $nom, string $categorie, string $caract, string $descOriginale, ?array $imageData
    ): string {
        $caractTexte = $this->formatterCaracteristiques($caract);

        $prompt = <<<PROMPT
Tu es un expert en rédaction de fiches produits e-commerce optimisées SEO.

Informations produit :
- Nom : {$nom}
- Catégorie : {$categorie}
- Caractéristiques : {$caractTexte}
- Description originale (fournie par le vendeur) : "{$descOriginale}"

Réécris et améliore cette description en respectant les règles SEO e-commerce suivantes :
- Intègre naturellement des mots-clés pertinents liés au produit et à sa catégorie
- Structure le texte en phrases claires, fluides et engageantes (pas de liste à puces)
- Mets en avant les bénéfices et caractéristiques du produit
- Ton commercial professionnel, persuasif mais factuel
- Longueur cible : 80 à 150 mots
- N'invente aucune caractéristique qui ne figure pas dans les informations fournies
PROMPT;

        if ($imageData !== null) {
            $prompt .= "\n- Appuie-toi également sur l'image jointe pour préciser des éléments visuels réels (couleur, forme, matière, style).";
        }

        $prompt .= "\n\nRéponds uniquement avec le texte final de la description, sans titre, sans guillemets, sans commentaire.";

        return $this->appellerModeleTexte($prompt, $imageData);
    }

    // ══════════════════════════════════════════════════════════
    //  TEXTE — génération depuis zéro (CAS 2 & 4)
    // ══════════════════════════════════════════════════════════
    private function genererDescription(
        string $nom, string $categorie, string $caract, ?array $imageData
    ): string {
        $caractTexte = $this->formatterCaracteristiques($caract);

        $prompt = <<<PROMPT
Tu es un expert en rédaction de fiches produits e-commerce optimisées SEO.

Informations produit (aucune description fournie par le vendeur) :
- Nom : {$nom}
- Catégorie : {$categorie}
- Caractéristiques : {$caractTexte}

Rédige une description produit originale en respectant les règles SEO e-commerce suivantes :
- Intègre naturellement des mots-clés pertinents liés au produit et à sa catégorie
- Structure le texte en phrases claires, fluides et engageantes (pas de liste à puces)
- Mets en avant les bénéfices concrets pour l'acheteur
- Ton commercial professionnel, persuasif mais factuel
- Longueur cible : 80 à 150 mots
- N'invente aucune caractéristique qui ne figure pas dans les informations fournies
PROMPT;

        if ($imageData !== null) {
            $prompt .= "\n- Base-toi également sur l'image jointe pour décrire fidèlement l'apparence du produit (couleur, forme, matière, style).";
        } else {
            $prompt .= "\n- Aucune image n'est disponible : ne décris pas d'éléments visuels que tu ne peux pas connaître (couleur exacte, texture...), reste sur les faits fournis.";
        }

        $prompt .= "\n\nRéponds uniquement avec le texte final de la description, sans titre, sans guillemets, sans commentaire.";

        return $this->appellerModeleTexte($prompt, $imageData);
    }

    private function formatterCaracteristiques(string $caract): string
    {
        $caract = trim($caract);
        if ($caract === '') {
            return 'Non renseignées';
        }
        $lignes = array_filter(array_map('trim', explode("\n", $caract)));
        return implode(', ', $lignes);
    }

    /**
     * Appel générique au modèle texte (multimodal si $imageData fourni).
     */
    private function appellerModeleTexte(string $prompt, ?array $imageData): string
    {
        $parts = [['text' => $prompt]];

        if ($imageData !== null) {
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $imageData['mime'],
                    'data'      => base64_encode($imageData['bytes']),
                ],
            ];
        }

        $response = $this->client->request('POST', self::BASE_URL . '/' . self::MODEL_TEXTE . ':generateContent', [
            'headers' => ['x-goog-api-key' => $this->apiKey, 'Content-Type' => 'application/json'],
            'json'    => ['contents' => [['parts' => $parts]]],
            'timeout' => 30,
        ]);

        $data = $response->toArray(false);

        if (isset($data['error'])) {
            throw new \RuntimeException('Erreur API Gemini (texte) : ' . ($data['error']['message'] ?? 'inconnue'));
        }

        $texte = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!$texte) {
            throw new \RuntimeException('Réponse Gemini vide ou inattendue.');
        }

        return trim($texte);
    }

    // ══════════════════════════════════════════════════════════
    //  IMAGE — génération (CAS 3 & 4)
    // ══════════════════════════════════════════════════════════
   // ══════════════════════════════════════════════════════════
//  IMAGE — génération via Pollinations.ai (gratuit, sans clé)
// ══════════════════════════════════════════════════════════
private function genererImage(string $nom, string $categorie, string $caract, string $descriptionGeneree): ?string
{
    $caractTexte = $this->formatterCaracteristiques($caract);

    $prompt = "Professional e-commerce product photo of {$nom}, category: {$categorie}, "
            . "key features: {$caractTexte}, studio packshot style, plain white background, "
            . "soft even lighting, centered product, sharp focus, high quality, no text, no logo, no watermark";

    $url = 'https://image.pollinations.ai/prompt/' . rawurlencode($prompt);

    try {
        $response = $this->client->request('GET', $url, [
            'query' => [
                'width'  => 1024,
                'height' => 1024,
                'model'  => 'flux',
                'nologo' => 'true',
                'seed'   => random_int(1, 999999999),
            ],
            'timeout' => 60, // la génération peut prendre 10 à 30s
        ]);

        if ($response->getStatusCode() !== 200) {
            return null;
        }

        $bytes = $response->getContent();
        if (strlen($bytes) < 1000) { // réponse anormalement petite = probablement une erreur
            return null;
        }

        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0775, true);
        }

        $filename = 'produit_ia_' . uniqid() . '.jpg';
        file_put_contents($this->uploadDir . '/' . $filename, $bytes);

        return '/uploads/produits/' . $filename;

    } catch (\Throwable $e) {
        return null; // ne bloque jamais la création du produit
    }
}

    // ══════════════════════════════════════════════════════════
    //  Téléchargement / validation de l'image source
    // ══════════════════════════════════════════════════════════
    private function telechargerImage(string $url): ?array
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        try {
            $response = $this->client->request('GET', $url, ['timeout' => 8]);
            if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
                return null;
            }

            $mime = $response->getHeaders()['content-type'][0] ?? '';
            if (!str_starts_with($mime, 'image/')) {
                return null;
            }

            $bytes = $response->getContent();
            if (strlen($bytes) === 0) {
                return null;
            }

            return ['bytes' => $bytes, 'mime' => explode(';', $mime)[0]];

        } catch (\Throwable $e) {
            return null; // lien mort / inaccessible → traité comme "image non trouvable"
        }
    }
}
