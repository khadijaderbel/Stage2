<?php

namespace App\Repository;

use App\Entity\HistoriqueImportation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class HistoriqueImportationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, HistoriqueImportation::class);
    }

    /** Les N derniers imports de l'utilisateur connecté */
    public function findByUtilisateur(int $utilisateurId, int $limit = 20): array
    {
        return $this->createQueryBuilder('h')
            ->andWhere('h.user = :uid')
            ->setParameter('uid', $utilisateurId)
            ->orderBy('h.dateImportation', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** Tous les imports, triés par date décroissante */
    public function findAllOrderedByDate(int $limit = 50): array
    {
        return $this->createQueryBuilder('h')
            ->leftJoin('h.user', 'u')
            ->addSelect('u')
            ->orderBy('h.dateImportation', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** Statistiques globales */
    public function getStats(): array
    {
        $qb = $this->createQueryBuilder('h')
            ->select('COUNT(h.id) as total')
            ->addSelect('SUM(CASE WHEN h.statut = :succes THEN 1 ELSE 0 END) as succes')
            ->addSelect('SUM(CASE WHEN h.statut = :succesWarnings THEN 1 ELSE 0 END) as succesWarnings')
            ->addSelect('SUM(CASE WHEN h.statut = :partiel THEN 1 ELSE 0 END) as partiel')
            ->addSelect('SUM(CASE WHEN h.statut = :echec THEN 1 ELSE 0 END) as echec')
            ->addSelect('SUM(h.nombreImportes) as produits')
            ->setParameter('succes', HistoriqueImportation::STATUT_SUCCES)
            ->setParameter('succesWarnings', HistoriqueImportation::STATUT_SUCCES_AVEC_WARNINGS)
            ->setParameter('partiel', HistoriqueImportation::STATUT_PARTIEL)
            ->setParameter('echec', HistoriqueImportation::STATUT_ECHEC)
            ->getQuery()
            ->getSingleResult();

        return [
            'total' => (int) ($qb['total'] ?? 0),
            'succes' => (int) ($qb['succes'] ?? 0),
            'succes_warnings' => (int) ($qb['succesWarnings'] ?? 0),
            'partiel' => (int) ($qb['partiel'] ?? 0),
            'echec' => (int) ($qb['echec'] ?? 0),
            'produits' => (int) ($qb['produits'] ?? 0),
        ];
    }
}
