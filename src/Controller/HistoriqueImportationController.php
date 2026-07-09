<?php

namespace App\Controller;

use App\Entity\HistoriqueImportation;
use App\Repository\HistoriqueImportationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/historique-importation')]
class HistoriqueImportationController extends AbstractController
{
    // ── Liste principale ────────────────────────────────────────────────────
    #[Route('/', name: 'app_historique_importation_index', methods: ['GET'])]
    public function index(HistoriqueImportationRepository $repo): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $historiques = $repo->findAllOrderedByDate(100);
        $stats = $repo->getStats();

        return $this->render('historique_importation/index.html.twig', [
            'historiques' => $historiques,
            'stats'       => $stats,
        ]);
    }

    // ── Détail d'un import ──────────────────────────────────────────────────
    #[Route('/{id}', name: 'app_historique_importation_show', methods: ['GET'])]
    public function show(HistoriqueImportation $historique): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return $this->render('historique_importation/show.html.twig', [
            'historique' => $historique,
        ]);
    }

    // ── Vider tout l'historique ─────────────────────────────────────────────
    #[Route('/vider', name: 'app_historique_importation_clear', methods: ['POST'])]
    public function clear(
        Request                         $request,
        HistoriqueImportationRepository $repo,
        EntityManagerInterface          $em
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if (!$this->isCsrfTokenValid('clear_historique', $request->request->get('_token'))) {
            $this->addFlash('error', 'Token CSRF invalide.');
            return $this->redirectToRoute('app_historique_importation_index');
        }

        foreach ($repo->findAll() as $h) {
            $em->remove($h);
        }
        $em->flush();

        $this->addFlash('success', 'Historique vidé avec succès.');
        return $this->redirectToRoute('app_historique_importation_index');
    }

    // ── Supprimer une entrée ────────────────────────────────────────────────
    #[Route('/{id}/delete', name: 'app_historique_importation_delete', methods: ['POST'])]
    public function delete(
        Request                $request,
        HistoriqueImportation  $historique,
        EntityManagerInterface $em
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if ($this->isCsrfTokenValid('delete_historique_'.$historique->getId(), $request->request->get('_token'))) {
            $em->remove($historique);
            $em->flush();
            $this->addFlash('success', 'Entrée supprimée.');
        }

        return $this->redirectToRoute('app_historique_importation_index');
    }
}
