<?php
namespace App\Service;
use App\Entity\Produit;
class AiProviderManager
{
    public function __construct(
        private GeminiService $gemini,
        private GroqService $groq
    ) {}
    public function genererContenuIA(Produit $produit, string $preferred = 'gemini'): array
    {
        $preferred = strtolower($preferred) === 'groq' ? 'groq' : 'gemini';
        $ordre = $preferred === 'groq' ? [$this->groq, $this->gemini] : [$this->gemini, $this->groq];
        $derniereException = null;

        foreach ($ordre as $index => $provider) {
            try {
                $resultat = $provider->genererContenuIA($produit);
                return [
                    'description' => $resultat['description'],
                    'imageUrl'    => $resultat['imageUrl'],
                    'provider'    => $provider->getNom(),
                    'fallback'    => $index > 0,
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
        return ['gemini' => $this->gemini->getNom(), 'groq' => $this->groq->getNom()];
    }
}