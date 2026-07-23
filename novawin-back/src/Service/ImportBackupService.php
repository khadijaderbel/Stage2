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

    public function saveBackup(UploadedFile $file, int $importId): string
    {
        $filename = $this->generateBackupFilename($importId, $file->getClientOriginalName());
        $this->filesystem->copy($file->getPathname(), $this->backupDir . $filename);
        return $filename;
    }

    public function getBackupContent(string $filename): ?string
    {
        $path = $this->backupDir . $filename;
        if (!$this->filesystem->exists($path)) return null;
        $content = file_get_contents($path);
        return $content !== false ? $content : null;
    }

    public function backupExists(string $filename): bool
    {
        return $this->filesystem->exists($this->backupDir . $filename);
    }

    public function generateBackupFilename(int $importId, string $originalName): string
    {
        return $importId . '_' . $originalName;
    }

    public function getBackupDir(): string
    {
        return $this->backupDir;
    }
}