<?php

namespace App\Service;

use App\Entity\Produit;

interface AiContentGeneratorInterface
{
    /**
     * Génère (ou améliore) la description et éventuellement une image
     * pour un produit donné.
     *
     * @return array{description: string, imageUrl: ?string}
     */
    public function genererContenuIA(Produit $produit): array;

    /** Nom lisible du fournisseur (ex: "Gemini", "Groq"), utilisé pour les logs/messages. */
    public function getNom(): string;
}
