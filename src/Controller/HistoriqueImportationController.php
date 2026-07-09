<?php

namespace App\Controller;

use App\Entity\HistoriqueImportation;
use App\Repository\HistoriqueImportationRepository;
use App\Service\ImportBackupService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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

    // ── Prévisualiser le contenu du fichier importé ──────────────────────
    #[Route('/{id}/preview', name: 'app_historique_importation_preview', methods: ['GET'])]
    public function preview(
        HistoriqueImportation $historique,
        ImportBackupService $backupService
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        // Générer le nom du fichier backup
        $backupFilename = $backupService->generateBackupFilename(
            $historique->getId(),
            $historique->getNomFichier()
        );

        $content = $backupService->getBackupContent($backupFilename);

        if (!$content) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Le fichier backup n\'existe pas.',
            ], 404);
        }

        // Déterminer le type de fichier
        $extension = $historique->getFormatFichier();
        $isCsv = in_array($extension, ['csv']);
        $isExcel = in_array($extension, ['xlsx', 'xls']);
        $isJson = $extension === 'json';

        // Si c'est du JSON, on le formate
        if ($isJson) {
            $data = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $content = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
        }

        // Si c'est du CSV, on le convertit en tableau pour l'affichage
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
            'success' => true,
            'content' => $content,
            'isJson' => $isJson,
            'isCsv' => $isCsv,
            'isExcel' => $isExcel,
            'headers' => $isCsv && !empty($previewData) ? array_keys($previewData[0]) : [],
            'previewData' => $isCsv ? $previewData : [],
            'filename' => $historique->getNomFichier(),
            'format' => $historique->getFormatFichier(),
        ]);
    }

    // ── Télécharger le fichier original ────────────────────────────────────
    #[Route('/{id}/download', name: 'app_historique_importation_download', methods: ['GET'])]
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
            $this->addFlash('error', 'Le fichier backup n\'existe pas.');
            return $this->redirectToRoute('app_historique_importation_show', ['id' => $historique->getId()]);
        }

        // Déterminer le type MIME
        $mimeTypes = [
            'csv' => 'text/csv',
            'json' => 'application/json',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls' => 'application/vnd.ms-excel',
        ];

        $mime = $mimeTypes[$historique->getFormatFichier()] ?? 'application/octet-stream';

        return new Response($content, 200, [
            'Content-Type' => $mime . '; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $historique->getNomFichier() . '"',
        ]);
    }

    // ── Vider tout l'historique ─────────────────────────────────────────────
    #[Route('/vider', name: 'app_historique_importation_clear', methods: ['POST'])]
    public function clear(
        Request                         $request,
        HistoriqueImportationRepository $repo,
        EntityManagerInterface          $em,
        ImportBackupService             $backupService
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if (!$this->isCsrfTokenValid('clear_historique', $request->request->get('_token'))) {
            $this->addFlash('error', 'Token CSRF invalide.');
            return $this->redirectToRoute('app_historique_importation_index');
        }

        // Supprimer les backups et les historiques
        foreach ($repo->findAll() as $h) {
            $backupFilename = $backupService->generateBackupFilename(
                $h->getId(),
                $h->getNomFichier()
            );
            // Supprimer le fichier s'il existe
            if ($backupService->backupExists($backupFilename)) {
                @unlink($backupService->getBackupDir() . $backupFilename);
            }
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
        EntityManagerInterface $em,
        ImportBackupService    $backupService
    ): Response {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        if ($this->isCsrfTokenValid('delete_historique_'.$historique->getId(), $request->request->get('_token'))) {
            // Supprimer le backup
            $backupFilename = $backupService->generateBackupFilename(
                $historique->getId(),
                $historique->getNomFichier()
            );
            if ($backupService->backupExists($backupFilename)) {
                @unlink($backupService->getBackupDir() . $backupFilename);
            }

            $em->remove($historique);
            $em->flush();
            $this->addFlash('success', 'Entrée supprimée.');
        }

        return $this->redirectToRoute('app_historique_importation_index');
    }
}
