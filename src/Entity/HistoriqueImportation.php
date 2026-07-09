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
    public const STATUT_SUCCES_AVEC_WARNINGS = 'succes_avec_warnings'; // NOUVEAU

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

    #[ORM\Column(length: 30)] // Augmenté pour accueillir 'succes_avec_warnings'
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
    public function isSuccesAvecWarnings(): bool { return $this->statut === self::STATUT_SUCCES_AVEC_WARNINGS; }
    public function isPartiel(): bool { return $this->statut === self::STATUT_PARTIEL; }
    public function isEchec(): bool   { return $this->statut === self::STATUT_ECHEC; }
    public function isEnCours(): bool { return $this->statut === self::STATUT_EN_COURS; }
    public function isReussi(): bool  { return $this->isSucces() || $this->isSuccesAvecWarnings(); }

    public function getLibelleStatut(): string
    {
        return match ($this->statut) {
            self::STATUT_SUCCES    => 'Réussi',
            self::STATUT_SUCCES_AVEC_WARNINGS => 'Réussi ⚠️',
            self::STATUT_PARTIEL   => 'Partiel',
            self::STATUT_ECHEC     => 'Échoué',
            self::STATUT_EN_COURS  => 'En cours',
            default                => $this->statut,
        };
    }

    public function getCouleurStatut(): string
    {
        return match ($this->statut) {
            self::STATUT_SUCCES    => '#28a745',
            self::STATUT_SUCCES_AVEC_WARNINGS => '#d4a017',
            self::STATUT_PARTIEL   => '#f0a500',
            self::STATUT_ECHEC     => '#dc3545',
            self::STATUT_EN_COURS  => '#6c757d',
            default                => '#6c757d',
        };
    }

    public function getIconeStatut(): string
    {
        return match ($this->statut) {
            self::STATUT_SUCCES    => 'fa-check-circle',
            self::STATUT_SUCCES_AVEC_WARNINGS => 'fa-exclamation-triangle',
            self::STATUT_PARTIEL   => 'fa-exclamation-triangle',
            self::STATUT_ECHEC     => 'fa-times-circle',
            self::STATUT_EN_COURS  => 'fa-spinner fa-spin',
            default                => 'fa-clock',
        };
    }

    public function getBadgeStatut(): string
    {
        return match ($this->statut) {
            self::STATUT_SUCCES    => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(40,167,69,0.15);color:#28a745;"><i class="fas fa-check-circle me-1"></i> Réussi</span>',
            self::STATUT_SUCCES_AVEC_WARNINGS => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(212,160,23,0.2);color:#d4a017;"><i class="fas fa-exclamation-triangle me-1"></i> Réussi ⚠️</span>',
            self::STATUT_PARTIEL   => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(240,165,0,0.15);color:#f0a500;"><i class="fas fa-exclamation-triangle me-1"></i> Partiel</span>',
            self::STATUT_ECHEC     => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(220,53,69,0.15);color:#dc3545;"><i class="fas fa-times-circle me-1"></i> Échoué</span>',
            self::STATUT_EN_COURS  => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(108,117,125,0.15);color:#6c757d;"><i class="fas fa-spinner fa-spin me-1"></i> En cours</span>',
            default                => '<span class="badge rounded-pill px-2 py-1" style="background:rgba(108,117,125,0.15);color:#6c757d;">' . $this->statut . '</span>',
        };
    }

    public function finaliserStatut(): void
    {
        if ($this->nombreImportes === 0 && $this->nombreErreurs === 0) {
            $this->statut = self::STATUT_SUCCES;
        } elseif ($this->nombreImportes === 0 && $this->nombreErreurs > 0) {
            $this->statut = self::STATUT_ECHEC;
        } elseif ($this->nombreErreurs > 0) {
            $this->statut = self::STATUT_PARTIEL;
        } else {
            $this->statut = self::STATUT_SUCCES;
        }
    }
}
