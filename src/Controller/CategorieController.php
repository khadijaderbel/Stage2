<?php

namespace App\Controller;

use App\Entity\Categorie;
use App\Form\CategorieType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/categorie')]
class CategorieController extends AbstractController
{
    #[Route('/', name: 'app_categorie_index', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $categories = $entityManager->getRepository(Categorie::class)->findBy(
            [],
            ['nom' => 'ASC']
        );

        return $this->render('categorie/index.html.twig', [
            'categories' => $categories,
        ]);
    }

    #[Route('/new', name: 'app_categorie_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $categorie = new Categorie();
        $categorie->setUtilisateur($this->getUser());

        $form = $this->createForm(CategorieType::class, $categorie);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($categorie);
            $entityManager->flush();

            $this->addFlash('success', 'La catégorie a été créée avec succès.');
            return $this->redirectToRoute('app_categorie_index');
        }

        // Si le formulaire est soumis mais invalide, afficher les erreurs
        if ($form->isSubmitted() && !$form->isValid()) {
            $errorMessages = [];
            foreach ($form->getErrors(true) as $error) {
                $errorMessages[] = $error->getMessage();
            }
            $this->addFlash('error', implode('|', $errorMessages));
        }

        return $this->render('categorie/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{id}/edit', name: 'app_categorie_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Categorie $categorie, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $form = $this->createForm(CategorieType::class, $categorie);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();
            $this->addFlash('success', 'La catégorie a été modifiée avec succès.');
            return $this->redirectToRoute('app_categorie_index');
        }

        // Si le formulaire est soumis mais invalide, afficher les erreurs
        if ($form->isSubmitted() && !$form->isValid()) {
            $errorMessages = [];
            foreach ($form->getErrors(true) as $error) {
                $errorMessages[] = $error->getMessage();
            }
            $this->addFlash('error', implode('|', $errorMessages));
        }

        return $this->render('categorie/edit.html.twig', [
            'form' => $form->createView(),
            'categorie' => $categorie,
        ]);
    }

    #[Route('/{id}/delete', name: 'app_categorie_delete', methods: ['POST'])]
    public function delete(Request $request, Categorie $categorie, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if ($this->isCsrfTokenValid('delete' . $categorie->getId(), $request->request->get('_token'))) {
            $entityManager->remove($categorie);
            $entityManager->flush();
            $this->addFlash('success', 'La catégorie a été supprimée avec succès.');
        }

        return $this->redirectToRoute('app_categorie_index');
    }

    #[Route('/{id}/show', name: 'app_categorie_show', methods: ['GET'])]
    public function show(Categorie $categorie): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return $this->render('categorie/show.html.twig', [
            'categorie' => $categorie,
        ]);
    }
}
