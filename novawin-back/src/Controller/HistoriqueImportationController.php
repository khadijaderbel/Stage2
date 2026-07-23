<?php

namespace App\Controller;

use App\Entity\HistoriqueImportation;
use App\Repository\HistoriqueImportationRepository;
use App\Service\ImportBackupService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/historique-importation')]
class HistoriqueImportationController extends AbstractController
{
    #[Route('', name: 'api_historique_importation_list', methods: ['GET'])]
    public function index(HistoriqueImportationRepository $repo): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $historiques = $repo->findAllOrderedByDate(100);
        $stats       = $repo->getStats();

        return new JsonResponse([
            'historiques' => array_map([$this, 'serializeListItem'], $historiques),
            'stats'       => $stats,
        ]);
    }

    #[Route('/{id}', name: 'api_historique_importation_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(HistoriqueImportation $historique): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return new JsonResponse($this->serializeDetail($historique));
    }

    #[Route('/{id}/preview', name: 'api_historique_importation_preview', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function preview(
        HistoriqueImportation $historique,
        ImportBackupService $backupService
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $backupFilename = $backupService->generateBackupFilename(
            $historique->getId(),
            $historique->getNomFichier()
        );

        $content = $backupService->getBackupContent($backupFilename);

        if (!$content) {
            return new JsonResponse(['success' => false, 'message' => 'Le fichier backup n\'existe pas.'], 404);
        }

        $extension = $historique->getFormatFichier();
        $isCsv     = $extension === 'csv';
        $isExcel   = in_array($extension, ['xlsx', 'xls']);
        $isJson    = $extension === 'json';

        if ($isJson) {
            $data = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $content = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
        }

        $previewData = [];
        if ($isCsv) {
            $lines = explode("\n", trim($content));
            if (!empty($lines)) {
                $headers = str_getcsv(array_shift($lines), ';');
                foreach ($lines as $line) {
                    if (trim($line) === '') continue;
                    $values = str_getcsv($line, ';');
                    $row = [];
                    foreach ($headers as $i => $header) {
                        $row[$header] = $values[$i] ?? '';
                    }
                    $previewData[] = $row;
                }
            }
        }

        return new JsonResponse([
            'success'     => true,
            'content'     => $content,
            'isJson'      => $isJson,
            'isCsv'       => $isCsv,
            'isExcel'     => $isExcel,
            'headers'     => $isCsv && !empty($previewData) ? array_keys($previewData[0]) : [],
            'previewData' => $isCsv ? $previewData : [],
            'filename'    => $historique->getNomFichier(),
            'format'      => $historique->getFormatFichier(),
        ]);
    }

    #[Route('/{id}/download', name: 'api_historique_importation_download', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function download(
        HistoriqueImportation $historique,
        ImportBackupService $backupService
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $backupFilename = $backupService->generateBackupFilename(
            $historique->getId(),
            $historique->getNomFichier()
        );

        $content = $backupService->getBackupContent($backupFilename);

        if (!$content) {
            return new Response('Fichier introuvable.', 404);
        }

        $mimeTypes = [
            'csv'  => 'text/csv',
            'json' => 'application/json',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls'  => 'application/vnd.ms-excel',
        ];

        $mime = $mimeTypes[$historique->getFormatFichier()] ?? 'application/octet-stream';

        return new Response($content, 200, [
            'Content-Type'        => $mime . '; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $historique->getNomFichier() . '"',
        ]);
    }

    #[Route('', name: 'api_historique_importation_clear', methods: ['DELETE'])]
    public function clear(
        HistoriqueImportationRepository $repo,
        EntityManagerInterface $em,
        ImportBackupService $backupService
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        foreach ($repo->findAll() as $h) {
            $backupFilename = $backupService->generateBackupFilename($h->getId(), $h->getNomFichier());
            if ($backupService->backupExists($backupFilename)) {
                @unlink($backupService->getBackupDir() . $backupFilename);
            }
            $em->remove($h);
        }
        $em->flush();

        return new JsonResponse(['success' => true, 'message' => 'Historique vidé avec succès.']);
    }

    #[Route('/{id}', name: 'api_historique_importation_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(
        HistoriqueImportation $historique,
        EntityManagerInterface $em,
        ImportBackupService $backupService
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $backupFilename = $backupService->generateBackupFilename($historique->getId(), $historique->getNomFichier());
        if ($backupService->backupExists($backupFilename)) {
            @unlink($backupService->getBackupDir() . $backupFilename);
        }

        $em->remove($historique);
        $em->flush();

        return new JsonResponse(['success' => true, 'message' => 'Entrée supprimée.']);
    }

    private function serializeListItem(HistoriqueImportation $h): array
    {
        return [
            'id'              => $h->getId(),
            'nomFichier'      => $h->getNomFichier(),
            'formatFichier'   => $h->getFormatFichier(),
            'dateImportation' => $h->getDateImportation()?->format('c'),
            'nombreLignes'    => $h->getNombreLignes(),
            'nombreImportes'  => $h->getNombreImportes(),
            'nombreErreurs'   => $h->getNombreErreurs(),
            'statut'          => $h->getStatut(),
        ];
    }

    private function serializeDetail(HistoriqueImportation $h): array
    {
        $user = $h->getUser();

        return array_merge($this->serializeListItem($h), [
            'messageResume' => $h->getMessageResume(),
            'user'          => $user ? ['id' => $user->getId(), 'prenom' => $user->getPrenom(), 'nom' => $user->getNom()] : null,
            'erreurs'       => $h->getDetailErreursArray() ?: [],
        ]);
    }
}