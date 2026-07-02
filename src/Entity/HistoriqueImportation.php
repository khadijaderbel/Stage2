<?php

namespace App\Entity;

use App\Repository\HistoriqueImportationRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: HistoriqueImportationRepository::class)]
#[ORM\Table(name: 'historique_importation')]
#[ORM\HasLifecycleCallbacks]
class HistoriqueImportation
{
    // ── Statuts possibles ──────────────────────────────────────────────────
    public const STATUT_EN_COURS  = 'en_cours';
    public const STATUT_SUCCES    = 'succes';
    public const STATUT_PARTIEL   = 'partiel';
    public const STATUT_ECHEC     = 'echec';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $nomFichier;

    #[ORM\Column(length: 10)]
    private string $formatFichier;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $dateImportation;

    #[ORM\Column]
    private int $nombreLignes = 0;

    #[ORM\Column]
    private int $nombreImportes = 0;

    #[ORM\Column]
    private int $nombreErreurs = 0;

    #[ORM\Column(length: 20)]
    private string $statut = self::STATUT_EN_COURS;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $detailErreurs = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $messageResume = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $user;


    // ── Lifecycle ──────────────────────────────────────────────────────────

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->dateImportation = new \DateTime();
    }

    // ── Getters / Setters ──────────────────────────────────────────────────

    public function getId(): ?int { return $this->id; }

    public function getNomFichier(): string { return $this->nomFichier; }
    public function setNomFichier(string $v): static { $this->nomFichier = $v; return $this; }

    public function getFormatFichier(): string { return $this->formatFichier; }
    public function setFormatFichier(string $v): static { $this->formatFichier = $v; return $this; }

    public function getDateImportation(): \DateTimeInterface { return $this->dateImportation; }
    public function setDateImportation(\DateTimeInterface $v): static { $this->dateImportation = $v; return $this; }

    public function getNombreLignes(): int { return $this->nombreLignes; }
    public function setNombreLignes(int $v): static { $this->nombreLignes = $v; return $this; }

    public function getNombreImportes(): int { return $this->nombreImportes; }
    public function setNombreImportes(int $v): static { $this->nombreImportes = $v; return $this; }

    public function getNombreErreurs(): int { return $this->nombreErreurs; }
    public function setNombreErreurs(int $v): static { $this->nombreErreurs = $v; return $this; }

    public function getStatut(): string { return $this->statut; }
    public function setStatut(string $v): static { $this->statut = $v; return $this; }

    public function getDetailErreurs(): ?string { return $this->detailErreurs; }
    public function setDetailErreurs(?string $v): static { $this->detailErreurs = $v; return $this; }

    public function getDetailErreursArray(): array
    {
        return $this->detailErreurs ? json_decode($this->detailErreurs, true) ?? [] : [];
    }

    public function getMessageResume(): ?string { return $this->messageResume; }
    public function setMessageResume(?string $v): static { $this->messageResume = $v; return $this; }

    public function getUser(): User { return $this->user; }
    public function setUser(User $v): static { $this->user = $v; return $this; }


    // ── Helpers ────────────────────────────────────────────────────────────

    public function isSucces(): bool  { return $this->statut === self::STATUT_SUCCES; }
    public function isPartiel(): bool { return $this->statut === self::STATUT_PARTIEL; }
    public function isEchec(): bool   { return $this->statut === self::STATUT_ECHEC; }

    public function finaliserStatut(): void
    {
        if ($this->nombreImportes === 0) {
            $this->statut = self::STATUT_ECHEC;
        } elseif ($this->nombreErreurs > 0) {
            $this->statut = self::STATUT_PARTIEL;
        } else {
            $this->statut = self::STATUT_SUCCES;
        }
    }
}
