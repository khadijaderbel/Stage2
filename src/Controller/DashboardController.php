<?php

namespace App\Controller;

use App\Entity\Produit;
use App\Entity\Categorie;
use App\Entity\User;
use App\Repository\HistoriqueImportationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/dashboard')]
class DashboardController extends AbstractController
{
    #[Route('/', name: 'app_dashboard', methods: ['GET'])]
    public function index(
        EntityManagerInterface $em,
        HistoriqueImportationRepository $historiqueRepo
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        // ── Statistiques ──────────────────────────────────────────────
        $totalProduits = $em->getRepository(Produit::class)->count([]);
        $totalCategories = $em->getRepository(Categorie::class)->count([]);
        $totalUsers = $em->getRepository(User::class)->count([]);

        // Produits par statut
        $produitsActifs = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.statut = :statut')
            ->setParameter('statut', 'actif')
            ->getQuery()
            ->getSingleScalarResult();

        $produitsRupture = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.statut = :statut')
            ->setParameter('statut', 'rupture')
            ->getQuery()
            ->getSingleScalarResult();

        // Dernier import
        $dernierImport = $historiqueRepo->findOneBy(
            [],
            ['dateImportation' => 'DESC']
        );

        // Statistiques d'import par mois (12 derniers mois)
        $importsMensuels = $this->getImportStatsByMonth($historiqueRepo);

        // Répartition par catégorie (top 5)
        $repartitionCategories = $this->getCategoryDistribution($em);

        // Derniers imports (5)
        $derniersImports = $historiqueRepo->findBy(
            [],
            ['dateImportation' => 'DESC'],
            5
        );

        return $this->render('dashboard/index.html.twig', [
            'totalProduits' => $totalProduits,
            'totalCategories' => $totalCategories,
            'totalUsers' => $totalUsers,
            'produitsActifs' => $produitsActifs,
            'produitsRupture' => $produitsRupture,
            'dernierImport' => $dernierImport,
            'importsMensuels' => $importsMensuels,
            'repartitionCategories' => $repartitionCategories,
            'derniersImports' => $derniersImports,
        ]);
    }

    private function getImportStatsByMonth(HistoriqueImportationRepository $repo): array
    {
        $months = [];
        $counts = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = new \DateTime();
            $date->modify("-$i months");
            $months[] = $date->format('M');

            $start = clone $date;
            $start->modify('first day of this month')->setTime(0, 0, 0);
            $end = clone $date;
            $end->modify('last day of this month')->setTime(23, 59, 59);

            $count = $repo->createQueryBuilder('h')
                ->select('SUM(h.nombreImportes)')
                ->where('h.dateImportation BETWEEN :start AND :end')
                ->andWhere('h.statut IN (:statuts)')
                ->setParameter('start', $start)
                ->setParameter('end', $end)
                ->setParameter('statuts', ['succes', 'partiel'])
                ->getQuery()
                ->getSingleScalarResult();

            $counts[] = (int) $count;
        }

        return ['months' => $months, 'counts' => $counts];
    }

    private function getCategoryDistribution(EntityManagerInterface $em): array
    {
        $results = $em->createQueryBuilder()
            ->select('c.nom as category, COUNT(p.id) as count')
            ->from(Produit::class, 'p')
            ->leftJoin('p.categorie', 'c')
            ->groupBy('c.id')
            ->orderBy('count', 'DESC')
            ->setMaxResults(5)
            ->getQuery()
            ->getResult();

        $categories = [];
        $counts = [];
        $colors = ['#00ffa3', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];

        foreach ($results as $index => $result) {
            $categories[] = $result['category'] ?? 'Sans catégorie';
            $counts[] = (int) $result['count'];
        }

        // Ajouter "Autres" si plus de 5 catégories
        $totalOther = $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->leftJoin('p.categorie', 'c')
            ->where('c.id NOT IN (:ids)')
            ->setParameter('ids', array_column($results, 'id'))
            ->getQuery()
            ->getSingleScalarResult();

        if ($totalOther > 0) {
            $categories[] = 'Autres';
            $counts[] = (int) $totalOther;
        }

        return ['categories' => $categories, 'counts' => $counts];
    }
}
