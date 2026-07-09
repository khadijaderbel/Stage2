<?php

namespace App\Service;

use App\Entity\Produit;

class AiProviderManager
{
    public function __construct(
        private GeminiService $gemini,
        private GroqService $groq
    ) {}

    /**
     * Génère le contenu IA en utilisant le fournisseur préféré.
     * Si celui-ci échoue (indisponible, quota, erreur réseau...),
     * bascule automatiquement sur l'autre fournisseur.
     *
     * @return array{description: string, imageUrl: ?string, provider: string, fallback: bool}
     */
    public function genererContenuIA(Produit $produit, string $preferred = 'gemini'): array
    {
        $preferred = strtolower($preferred) === 'groq' ? 'groq' : 'gemini';

        $ordre = $preferred === 'groq'
            ? [$this->groq, $this->gemini]
            : [$this->gemini, $this->groq];

        $derniereException = null;

        foreach ($ordre as $index => $provider) {
            try {
                $resultat = $provider->genererContenuIA($produit);
                return [
                    'description' => $resultat['description'],
                    'imageUrl'    => $resultat['imageUrl'],
                    'provider'    => $provider->getNom(),
                    'fallback'    => $index > 0, // true si on n'a pas utilisé le 1er choix
                ];
            } catch (\Throwable $e) {
                $derniereException = $e;
                continue;
            }
        }

        throw new \RuntimeException(
            'Les deux services IA (Gemini et Groq) sont indisponibles. Dernière erreur : '
            . ($derniereException?->getMessage() ?? 'inconnue')
        );
    }

    public function getProviderNames(): array
    {
        return [
            'gemini' => $this->gemini->getNom(),
            'groq'   => $this->groq->getNom(),
        ];
    }
}
