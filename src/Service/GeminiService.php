<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class GeminiService extends AbstractAiContentGenerator
{
    private const MODEL_TEXTE = 'gemini-3.5-flash';
    private const BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct(
        HttpClientInterface $client,
        private string $apiKey,
        string $uploadDir
    ) {
        parent::__construct($client, $uploadDir);
    }

    public function getNom(): string
    {
        return 'Gemini';
    }

    protected function appellerModeleTexte(string $prompt, ?array $imageData): string
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
}
