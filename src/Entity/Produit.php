<?php

namespace App\Entity;

use App\Repository\ProduitRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ProduitRepository::class)]
#[ORM\Table(name: 'produit')]
class Produit
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    #[Assert\NotBlank(message: 'Le SKU est obligatoire.')]
    #[Assert\Regex(
        pattern: '/^[A-Z0-9\-]+$/',
        message: 'Le SKU ne doit contenir que des lettres majuscules, chiffres et tirets.'
    )]
    private ?string $sku = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Le nom est obligatoire.')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le nom doit contenir au moins 2 caractères.')]
    private ?string $nom = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $caracteristiques = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descriptionOriginale = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descriptionGeneree = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Le statut est obligatoire.')]
    #[Assert\Choice(
        choices: ['actif', 'inactif', 'rupture'],
        message: 'Le statut doit être : actif, inactif ou rupture.'
    )]
    private ?string $statut = 'actif';

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $dateCreation = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateModification = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'utilisateur_id', referencedColumnName: 'id', nullable: false)]
    private ?User $utilisateur = null;

    #[ORM\ManyToOne(targetEntity: Categorie::class)]
    #[ORM\JoinColumn(name: 'categorie_id', referencedColumnName: 'id', nullable: false)]
    private ?Categorie $categorie = null;

    public function __construct()
    {
        $this->dateCreation = new \DateTime();
        $this->statut = 'actif';
    }

    public function getId(): ?int { return $this->id; }

    public function getSku(): ?string { return $this->sku; }
    public function setSku(string $sku): static { $this->sku = strtoupper(trim($sku)); return $this; }

    public function getNom(): ?string { return $this->nom; }
    public function setNom(string $nom): static { $this->nom = trim($nom); return $this; }

    public function getCaracteristiques(): ?string { return $this->caracteristiques; }
    public function setCaracteristiques(?string $c): static { $this->caracteristiques = $c; return $this; }

    public function getImageUrl(): ?string { return $this->imageUrl; }
    public function setImageUrl(?string $url): static { $this->imageUrl = $url; return $this; }

    public function getDescriptionOriginale(): ?string { return $this->descriptionOriginale; }
    public function setDescriptionOriginale(?string $d): static { $this->descriptionOriginale = $d; return $this; }

    public function getDescriptionGeneree(): ?string { return $this->descriptionGeneree; }
    public function setDescriptionGeneree(?string $d): static { $this->descriptionGeneree = $d; return $this; }

    public function getStatut(): ?string { return $this->statut; }
    public function setStatut(string $s): static { $this->statut = $s; return $this; }

    public function getDateCreation(): ?\DateTimeInterface { return $this->dateCreation; }
    public function setDateCreation(\DateTimeInterface $d): static { $this->dateCreation = $d; return $this; }

    public function getDateModification(): ?\DateTimeInterface { return $this->dateModification; }
    public function setDateModification(?\DateTimeInterface $d): static { $this->dateModification = $d; return $this; }

    public function getUtilisateur(): ?User { return $this->utilisateur; }
    public function setUtilisateur(?User $u): static { $this->utilisateur = $u; return $this; }

    public function getCategorie(): ?Categorie { return $this->categorie; }
    public function setCategorie(?Categorie $c): static { $this->categorie = $c; return $this; }
}
