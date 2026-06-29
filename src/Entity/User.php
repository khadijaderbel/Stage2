<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[UniqueEntity(fields: ['email'], message: 'Cet email est déjà utilisé.')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Le nom est obligatoire.')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le nom doit contenir au moins 2 caractères.')]
    private ?string $nom = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Le prénom est obligatoire.')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Le prénom doit contenir au moins 2 caractères.')]
    private ?string $prenom = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank(message: 'L\'email est obligatoire.')]
    #[Assert\Email(message: 'Veuillez saisir un email valide.')]
    private ?string $email = null;

    #[ORM\Column(length: 255)]
    private ?string $passwordHash = null;

    #[ORM\Column]
    private ?\DateTime $dateCreation = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Le rôle est obligatoire.')]
    #[Assert\Choice(choices: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER'], message: 'Rôle invalide.')]
    private ?string $role = null;

    #[ORM\Column]
    private ?bool $actif = null;

    // Champ virtuel pour le mot de passe (non mappé en base)
    private ?string $plainPassword = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNom(): ?string
    {
        return $this->nom;
    }

    public function setNom(string $nom): static
    {
        $this->nom = $nom;
        return $this;
    }

    public function getPrenom(): ?string
    {
        return $this->prenom;
    }

    public function setPrenom(string $prenom): static
    {
        $this->prenom = $prenom;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getPasswordHash(): ?string
    {
        return $this->passwordHash;
    }

    public function setPasswordHash(string $passwordHash): static
    {
        $this->passwordHash = $passwordHash;
        return $this;
    }

    public function getDateCreation(): ?\DateTime
    {
        return $this->dateCreation;
    }

    public function setDateCreation(\DateTime $dateCreation): static
    {
        $this->dateCreation = $dateCreation;
        return $this;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(string $role): static
    {
        $this->role = $role;
        return $this;
    }

    public function isActif(): ?bool
    {
        return $this->actif;
    }

    public function setActif(bool $actif): static
    {
        $this->actif = $actif;
        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): static
    {
        $this->plainPassword = $plainPassword;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->passwordHash;
    }

    public function eraseCredentials(): void
    {
        $this->plainPassword = null;
    }

    public function getRoles(): array
    {
        // Retourner le rôle exactement comme stocké en base
        if ($this->role) {
            return [$this->role];
        }
        return ['ROLE_USER'];
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    // ============================================
    // HELPERS POUR LES RÔLES
    // ============================================

    public function isSuperAdmin(): bool
    {
        return $this->role === 'ROLE_SUPER_ADMIN';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']);
    }

    public function getDisplayRole(): string
    {
        $roles = [
            'ROLE_SUPER_ADMIN' => 'Super Administrateur',
            'ROLE_ADMIN' => 'Administrateur',
            'ROLE_USER' => 'Utilisateur'
        ];
        return $roles[$this->role] ?? $this->role;
    }

    public function getRoleColor(): string
    {
        $colors = [
            'ROLE_SUPER_ADMIN' => 'danger',
            'ROLE_ADMIN' => 'warning',
            'ROLE_USER' => 'info'
        ];
        return $colors[$this->role] ?? 'secondary';
    }

    public function getRoleIcon(): string
    {
        $icons = [
            'ROLE_SUPER_ADMIN' => 'fa-crown',
            'ROLE_ADMIN' => 'fa-shield-halved',
            'ROLE_USER' => 'fa-user'
        ];
        return $icons[$this->role] ?? 'fa-user';
    }
}
