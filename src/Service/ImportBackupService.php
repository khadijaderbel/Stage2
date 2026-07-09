<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Filesystem\Filesystem;

class ImportBackupService
{
    private string $backupDir;
    private Filesystem $filesystem;

    public function __construct(string $projectDir)
    {
        $this->backupDir = $projectDir . '/var/imports/backups/';
        $this->filesystem = new Filesystem();

        if (!$this->filesystem->exists($this->backupDir)) {
            $this->filesystem->mkdir($this->backupDir, 0755);
        }
    }

    /**
     * Sauvegarde un fichier importé
     */
    public function saveBackup(UploadedFile $file, int $importId): string
    {
        $filename = $this->generateBackupFilename($importId, $file->getClientOriginalName());
        $path = $this->backupDir . $filename;

        $this->filesystem->copy($file->getPathname(), $path);

        return $filename;
    }

    /**
     * Récupère le contenu d'un fichier backup
     */
    public function getBackupContent(string $filename): ?string
    {
        $path = $this->backupDir . $filename;

        if (!$this->filesystem->exists($path)) {
            return null;
        }

        $content = file_get_contents($path);
        return $content !== false ? $content : null;
    }

    /**
     * Vérifie si un fichier backup existe
     */
    public function backupExists(string $filename): bool
    {
        return $this->filesystem->exists($this->backupDir . $filename);
    }

    /**
     * Génère un nom de fichier backup à partir des paramètres
     * Format: {importId}_{nomFichier}
     */
    public function generateBackupFilename(int $importId, string $originalName): string
    {
        return $importId . '_' . $originalName;
    }

    /**
     * Récupère le chemin du dossier de backup
     */
    public function getBackupDir(): string
    {
        return $this->backupDir;
    }
}
