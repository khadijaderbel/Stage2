<?php

namespace App\Controller;

use App\Entity\Categorie;
use App\Entity\HistoriqueImportation;
use App\Entity\Produit;
use App\Entity\User;
use App\Repository\HistoriqueImportationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/dashboard')]
class DashboardController extends AbstractController
{
    #[Route('', name: 'api_dashboard', methods: ['GET'])]
    public function index(
        EntityManagerInterface $em,
        HistoriqueImportationRepository $historiqueRepo
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $totalProduits   = $em->getRepository(Produit::class)->count([]);
        $totalCategories = $em->getRepository(Categorie::class)->count([]);
        $totalUsers      = $em->getRepository(User::class)->count([]);

        $produitsActifs = (int) $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.statut = :statut')
            ->setParameter('statut', 'actif')
            ->getQuery()
            ->getSingleScalarResult();

        $produitsRupture = (int) $em->getRepository(Produit::class)
            ->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.statut = :statut')
            ->setParameter('statut', 'rupture')
            ->getQuery()
            ->getSingleScalarResult();

        $dernierImport   = $historiqueRepo->findOneBy([], ['dateImportation' => 'DESC']);
        $derniersImports = $historiqueRepo->findBy([], ['dateImportation' => 'DESC'], 5);

        return new JsonResponse([
            'totalProduits'         => $totalProduits,
            'totalCategories'       => $totalCategories,
            'totalUsers'            => $totalUsers,
            'produitsActifs'        => $produitsActifs,
            'produitsRupture'       => $produitsRupture,
            'dernierImport'         => $this->serializeHistorique($dernierImport),
            'importsMensuels'       => $this->getImportStatsByMonth($historiqueRepo),
            'repartitionCategories' => $this->getCategoryDistribution($em),
            'derniersImports'       => array_map([$this, 'serializeHistorique'], $derniersImports),
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

            $start = (clone $date)->modify('first day of this month')->setTime(0, 0, 0);
            $end   = (clone $date)->modify('last day of this month')->setTime(23, 59, 59);

            $count = $repo->createQueryBuilder('h')
                ->select('SUM(h.nombreImportes)')
                ->where('h.dateImportation BETWEEN :start AND :end')
                ->andWhere('h.statut IN (:statuts)')
                ->setParameter('start', $start)
                ->setParameter('end', $end)
                ->setParameter('statuts', ['succes', 'partiel', 'succes_avec_warnings'])
                ->getQuery()
                ->getSingleScalarResult();

            $counts[] = (int) $count;
        }

        return ['months' => $months, 'counts' => $counts];
    }

    private function getCategoryDistribution(EntityManagerInterface $em): array
    {
        // Une seule requête triée par volume décroissant, puis on découpe
        // top 5 / reste — plus de NOT IN(:ids) avec un tableau vide.
        $allResults = $em->createQueryBuilder()
            ->select('c.nom as category', 'COUNT(p.id) as count')
            ->from(Produit::class, 'p')
            ->leftJoin('p.categorie', 'c')
            ->groupBy('c.id')
            ->orderBy('count', 'DESC')
            ->getQuery()
            ->getResult();

        $top5 = array_slice($allResults, 0, 5);
        $rest = array_slice($allResults, 5);

        $categories = [];
        $counts     = [];
        foreach ($top5 as $r) {
            $categories[] = $r['category'] ?? 'Sans catégorie';
            $counts[]     = (int) $r['count'];
        }

        $totalOther = array_sum(array_map(fn($r) => (int) $r['count'], $rest));
        if ($totalOther > 0) {
            $categories[] = 'Autres';
            $counts[]     = $totalOther;
        }

        return ['categories' => $categories, 'counts' => $counts];
    }

    private function serializeHistorique(?HistoriqueImportation $h): ?array
    {
        if (!$h) {
            return null;
        }

        return [
            'id'              => $h->getId(),
            'nomFichier'      => $h->getNomFichier(),
            'statut'          => $h->getStatut(),
            'dateImportation' => $h->getDateImportation()?->format('c'),
            'nombreImportes'  => $h->getNombreImportes(),
            'nombreErreurs'   => $h->getNombreErreurs(),
        ];
    }
}