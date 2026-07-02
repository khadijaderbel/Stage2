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
}
