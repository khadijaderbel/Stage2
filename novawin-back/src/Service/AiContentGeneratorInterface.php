<?php

namespace App\Service;

use App\Entity\Produit;

interface AiContentGeneratorInterface
{
    /**
     * @return array{description: string, imageUrl: ?string}
     */
    public function genererContenuIA(Produit $produit): array;

    public function getNom(): string;
}