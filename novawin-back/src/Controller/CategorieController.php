<?php

namespace App\Controller;

use App\Entity\Categorie;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/categories')]
class CategorieController extends AbstractController
{
    #[Route('', name: 'api_categories_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $categories = $em->getRepository(Categorie::class)->findBy([], ['nom' => 'ASC']);

        return new JsonResponse([
            'categories' => array_map([$this, 'serializeCategorie'], $categories),
            'total'      => count($categories),
        ]);
    }

    #[Route('/{id}', name: 'api_categories_show', methods: ['GET'])]
    public function show(Categorie $categorie): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return new JsonResponse($this->serializeCategorie($categorie));
    }

    #[Route('', name: 'api_categories_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, ValidatorInterface $validator): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true) ?? [];
        $nom  = trim($data['nom'] ?? '');

        if ($nom === '') {
            return new JsonResponse(['success' => false, 'errors' => ['Le nom de la catégorie est obligatoire.']], 400);
        }

        $categorie = new Categorie();
        $categorie->setNom($nom);
        $categorie->setDescription(trim($data['description'] ?? '') ?: null);
        $categorie->setUtilisateur($this->getUser());

        $errors = $this->collectViolations($validator->validate($categorie));
        if (!empty($errors)) {
            return new JsonResponse(['success' => false, 'errors' => $errors], 400);
        }

        $em->persist($categorie);
        $em->flush();

        return new JsonResponse([
            'success'   => true,
            'message'   => 'La catégorie a été créée avec succès.',
            'categorie' => $this->serializeCategorie($categorie),
        ], 201);
    }

    #[Route('/{id}', name: 'api_categories_edit', methods: ['PUT'])]
    public function edit(Categorie $categorie, Request $request, EntityManagerInterface $em, ValidatorInterface $validator): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('nom', $data)) {
            $nom = trim($data['nom']);
            if ($nom === '') {
                return new JsonResponse(['success' => false, 'errors' => ['Le nom de la catégorie est obligatoire.']], 400);
            }
            $categorie->setNom($nom);
        }
        if (array_key_exists('description', $data)) {
            $categorie->setDescription(trim((string) $data['description']) ?: null);
        }

        $errors = $this->collectViolations($validator->validate($categorie));
        if (!empty($errors)) {
            return new JsonResponse(['success' => false, 'errors' => $errors], 400);
        }

        $em->flush();

        return new JsonResponse([
            'success'   => true,
            'message'   => 'La catégorie a été modifiée avec succès.',
            'categorie' => $this->serializeCategorie($categorie),
        ]);
    }

    #[Route('/{id}', name: 'api_categories_delete', methods: ['DELETE'])]
    public function delete(Categorie $categorie, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $nom = $categorie->getNom();

        try {
            $em->remove($categorie);
            $em->flush();
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Impossible de supprimer cette catégorie : elle est probablement liée à des produits existants.',
            ], 409);
        }

        return new JsonResponse([
            'success' => true,
            'message' => "La catégorie « {$nom} » a été supprimée avec succès.",
        ]);
    }

    private function collectViolations(iterable $violations): array
    {
        $messages = [];
        foreach ($violations as $violation) {
            $messages[] = $violation->getMessage();
        }
        return $messages;
    }

    private function serializeCategorie(Categorie $categorie): array
    {
        $utilisateur = $categorie->getUtilisateur();

        return [
            'id'          => $categorie->getId(),
            'nom'         => $categorie->getNom(),
            'description' => $categorie->getDescription(),
            'utilisateur' => $utilisateur ? [
                'id'     => $utilisateur->getId(),
                'prenom' => $utilisateur->getPrenom(),
                'nom'    => $utilisateur->getNom(),
            ] : null,
        ];
    }
}