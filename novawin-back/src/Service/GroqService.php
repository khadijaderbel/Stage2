<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class GroqService extends AbstractAiContentGenerator
{
    private const MODEL_TEXTE  = 'llama-3.3-70b-versatile';
    private const MODEL_VISION = 'llama-3.2-11b-vision-preview';
    private const BASE_URL     = 'https://api.groq.com/openai/v1/chat/completions';

    public function __construct(HttpClientInterface $client, private string $apiKey, string $uploadDir)
    {
        parent::__construct($client, $uploadDir);
    }

    public function getNom(): string { return 'Groq'; }

    protected function appellerModeleTexte(string $prompt, ?array $imageData): string
    {
        if ($imageData !== null) {
            $dataUri = 'data:' . $imageData['mime'] . ';base64,' . base64_encode($imageData['bytes']);
            $content = [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => $dataUri]],
            ];
            $model = self::MODEL_VISION;
        } else {
            $content = $prompt;
            $model   = self::MODEL_TEXTE;
        }

        $response = $this->client->request('POST', self::BASE_URL, [
            'headers' => ['Authorization' => 'Bearer ' . $this->apiKey, 'Content-Type' => 'application/json'],
            'json'    => ['model' => $model, 'messages' => [['role' => 'user', 'content' => $content]], 'temperature' => 0.7],
            'timeout' => 30,
        ]);

        $data = $response->toArray(false);
        if (isset($data['error'])) {
            throw new \RuntimeException('Erreur API Groq (texte) : ' . ($data['error']['message'] ?? 'inconnue'));
        }

        $texte = $data['choices'][0]['message']['content'] ?? null;
        if (!$texte) throw new \RuntimeException('Réponse Groq vide ou inattendue.');

        return trim($texte);
    }
}