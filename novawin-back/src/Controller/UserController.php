<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api')]
class UserController extends AbstractController
{
    // ══════════════════════════════════════════════
    //  UTILISATEUR CONNECTÉ
    // ══════════════════════════════════════════════

    #[Route('/users/me', name: 'api_users_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return new JsonResponse(['message' => 'Non authentifié.'], 401);
        }
        return new JsonResponse($this->serializeUser($user));
    }

    // ══════════════════════════════════════════════
    //  RÉCUPÉRER UN UTILISATEUR PAR ID
    // ══════════════════════════════════════════════

    #[Route('/users/{id}', name: 'api_users_show', methods: ['GET'])]
    public function show(User $user): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        
        $currentUser = $this->getUser();
        
        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return new JsonResponse(['message' => 'Droits insuffisants pour voir ce profil.'], 403);
        }

        return new JsonResponse($this->serializeUser($user, $currentUser));
    }

    // ══════════════════════════════════════════════
    //  LISTE + RECHERCHE
    // ══════════════════════════════════════════════

    #[Route('/users', name: 'api_users_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $search = $request->query->get('search', '');
        $status = $request->query->get('status', 'all');

        $qb = $em->createQueryBuilder()->select('u')->from(User::class, 'u');

        if ($search !== '') {
            $qb->andWhere('LOWER(u.prenom) LIKE :search OR LOWER(u.nom) LIKE :search OR LOWER(u.email) LIKE :search')
               ->setParameter('search', '%' . strtolower($search) . '%');
        }
        if ($status === 'active') {
            $qb->andWhere('u.actif = :actif')->setParameter('actif', true);
        } elseif ($status === 'inactive') {
            $qb->andWhere('u.actif = :actif')->setParameter('actif', false);
        }

        $qb->orderBy('u.prenom', 'ASC');
        $users = $qb->getQuery()->getResult();

        $currentUser   = $this->getUser();
        $data          = array_map(fn(User $u) => $this->serializeUser($u, $currentUser), $users);
        $activeCount   = count(array_filter($users, fn(User $u) => $u->isActif()));
        $inactiveCount = count($users) - $activeCount;

        return new JsonResponse([
            'users'         => $data,
            'total'         => count($users),
            'activeCount'   => $activeCount,
            'inactiveCount' => $inactiveCount,
        ]);
    }

    // ══════════════════════════════════════════════
    //  INSCRIPTION
    // ══════════════════════════════════════════════

    #[Route('/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
        ValidatorInterface $validator
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];

        $prenom          = trim($data['prenom'] ?? '');
        $nom             = trim($data['nom'] ?? '');
        $email           = trim($data['email'] ?? '');
        $password        = $data['password'] ?? '';
        $passwordConfirm = $data['password_confirm'] ?? '';
        $acceptTerms     = $data['accept_terms'] ?? false;

        $errors = [];
        if (strlen($password) < 6)              $errors[] = 'Le mot de passe doit contenir au moins 6 caractères.';
        if ($password !== $passwordConfirm)     $errors[] = 'Les mots de passe ne correspondent pas.';
        if (!$acceptTerms)                       $errors[] = 'Vous devez accepter la charte d\'utilisation.';
        if ($em->getRepository(User::class)->findOneBy(['email' => $email])) {
            $errors[] = 'Cet email est déjà utilisé.';
        }

        $user = new User();
        $user->setPrenom($prenom);
        $user->setNom($nom);
        $user->setEmail($email);
        $user->setRole('ROLE_ADMIN');
        $user->setActif(true);
        $user->setDateCreation(new \DateTime());

        foreach ($validator->validate($user) as $violation) {
            $errors[] = $violation->getMessage();
        }

        if (!empty($errors)) {
            return new JsonResponse(['success' => false, 'errors' => $errors], 400);
        }

        $user->setPasswordHash($passwordHasher->hashPassword($user, $password));
        $em->persist($user);
        $em->flush();

        return new JsonResponse([
            'success' => true,
            'message' => 'Compte créé avec succès. Vous pouvez maintenant vous connecter.',
        ], 201);
    }

    // ══════════════════════════════════════════════
    //  MODIFICATION PAR UN ADMIN
    // ══════════════════════════════════════════════

    #[Route('/users/{id}', name: 'api_users_edit', methods: ['PUT'])]
    public function edit(User $user, Request $request, EntityManagerInterface $em, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $currentUser = $this->getUser();

        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return new JsonResponse(['success' => false, 'message' => 'Droits insuffisants pour modifier un Super Administrateur.'], 403);
        }
        if ($user->getId() === $currentUser->getId()) {
            return new JsonResponse(['success' => false, 'message' => 'Utilisez la page profil pour modifier votre propre compte.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['prenom'])) $user->setPrenom(trim($data['prenom']));
        if (isset($data['nom']))    $user->setNom(trim($data['nom']));
        if (isset($data['email'])) $user->setEmail(trim($data['email']));
        if (!empty($data['role']) && $this->isGranted('ROLE_SUPER_ADMIN')) {
            $user->setRole($data['role']);
        }
        if (!empty($data['password'])) {
            $user->setPasswordHash($passwordHasher->hashPassword($user, $data['password']));
        }

        $em->flush();

        return new JsonResponse(['success' => true, 'message' => 'Utilisateur modifié avec succès.', 'user' => $this->serializeUser($user)]);
    }

    // ══════════════════════════════════════════════
    //  ACTIVER / DÉSACTIVER
    // ══════════════════════════════════════════════

    #[Route('/users/{id}/toggle-status', name: 'api_users_toggle_status', methods: ['POST'])]
    public function toggleStatus(User $user, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $currentUser = $this->getUser();

        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return new JsonResponse(['success' => false, 'message' => 'Droits insuffisants.'], 403);
        }
        if ($user->getId() === $currentUser->getId()) {
            return new JsonResponse(['success' => false, 'message' => 'Vous ne pouvez pas modifier votre propre statut.'], 403);
        }

        $user->setActif(!$user->isActif());
        $em->flush();

        $status = $user->isActif() ? 'activé' : 'désactivé';
        return new JsonResponse(['success' => true, 'message' => "Utilisateur {$status} avec succès.", 'actif' => $user->isActif()]);
    }

    // ══════════════════════════════════════════════
    //  SUPPRESSION
    // ══════════════════════════════════════════════

    #[Route('/users/{id}', name: 'api_users_delete', methods: ['DELETE'])]
    public function delete(User $user, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        $currentUser = $this->getUser();

        if ($user->getId() === $currentUser->getId()) {
            return new JsonResponse(['success' => false, 'message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 403);
        }
        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return new JsonResponse(['success' => false, 'message' => 'Droits insuffisants.'], 403);
        }

        $em->remove($user);
        $em->flush();

        return new JsonResponse(['success' => true, 'message' => 'Utilisateur supprimé avec succès.']);
    }

    // ══════════════════════════════════════════════
    //  PROFIL
    // ══════════════════════════════════════════════

    #[Route('/profile', name: 'api_profile_update', methods: ['PUT'])]
    public function updateProfile(Request $request, EntityManagerInterface $em, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true) ?? [];

        $currentPassword = $data['current_password'] ?? '';
        $newPassword     = $data['new_password'] ?? '';
        $confirmPassword = $data['confirm_password'] ?? '';

        $errors = [];
        if (empty($currentPassword) || !$passwordHasher->isPasswordValid($user, $currentPassword)) {
            $errors[] = 'Le mot de passe actuel est incorrect.';
        }
        if (!empty($newPassword)) {
            if (strlen($newPassword) < 6)          $errors[] = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
            if ($newPassword !== $confirmPassword) $errors[] = 'Les mots de passe ne correspondent pas.';
        }
        if (!empty($errors)) {
            return new JsonResponse(['success' => false, 'errors' => $errors], 400);
        }

        if (isset($data['prenom'])) $user->setPrenom(trim($data['prenom']));
        if (isset($data['nom']))    $user->setNom(trim($data['nom']));
        if (isset($data['email'])) $user->setEmail(trim($data['email']));
        if (!empty($newPassword))  $user->setPasswordHash($passwordHasher->hashPassword($user, $newPassword));

        $em->flush();

        return new JsonResponse(['success' => true, 'message' => 'Profil mis à jour.', 'user' => $this->serializeUser($user)]);
    }

    // ══════════════════════════════════════════════
    //  TEST LOGIN (à supprimer après)
    // ══════════════════════════════════════════════

    #[Route('/test-login', name: 'api_test_login', methods: ['POST'])]
    public function testLogin(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? $data['username'] ?? null;
        $password = $data['password'] ?? null;

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        return new JsonResponse([
            'email_received' => $email,
            'user_found' => $user ? true : false,
            'password_hash_prefix' => $user ? substr($user->getPasswordHash(), 0, 10) : null,
        ]);
    }

    // ══════════════════════════════════════════════
    //  SERIALIZE
    // ══════════════════════════════════════════════

    private function serializeUser(User $user, ?User $currentUser = null): array
    {
        return [
            'id'            => $user->getId(),
            'prenom'        => $user->getPrenom(),
            'nom'           => $user->getNom(),
            'email'         => $user->getEmail(),
            'role'          => $user->getRole(),
            'displayRole'   => method_exists($user, 'getDisplayRole') ? $user->getDisplayRole() : $user->getRole(),
            'actif'         => $user->isActif(),
            'isSuperAdmin'  => $user->isSuperAdmin(),
            'isCurrentUser' => $currentUser ? $user->getId() === $currentUser->getId() : null,
            'initial'       => mb_substr($user->getPrenom() ?? '', 0, 1),
        ];
    }
}