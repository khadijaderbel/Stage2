<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/ai-provider')]
class AiProviderController extends AbstractController
{
    #[Route('/select', name: 'app_ai_set_provider', methods: ['POST'])]
    public function select(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data     = json_decode($request->getContent(), true);
        $provider = strtolower(trim($data['provider'] ?? ''));

        if (!in_array($provider, ['gemini', 'groq'], true)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Fournisseur IA invalide. Valeurs acceptées : gemini, groq.',
            ], 400);
        }

        $request->getSession()->set('ai_provider', $provider);

        return new JsonResponse([
            'success'  => true,
            'provider' => $provider,
            'message'  => "Modèle IA actif : " . ucfirst($provider),
        ]);
    }

    #[Route('/current', name: 'app_ai_get_provider', methods: ['GET'])]
    public function current(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return new JsonResponse([
            'provider' => $request->getSession()->get('ai_provider', 'gemini'),
        ]);
    }
}
