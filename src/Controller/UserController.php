<?php

namespace App\Controller;

use App\Entity\User;
use App\Form\UserFormType;
use App\Service\EmailService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class UserController extends AbstractController
{
    #[Route('/user', name: 'app_user')]
    public function index(EntityManagerInterface $entityManager): Response
    {
        // Vérifier que l'utilisateur a le rôle ROLE_ADMIN ou ROLE_SUPER_ADMIN
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $users = $entityManager->getRepository(User::class)->findAll();

        return $this->render('user/index.html.twig', [
            'users' => $users,
        ]);
    }

    #[Route('/user/search', name: 'app_user_search', methods: ['GET'])]
    public function search(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $search = $request->query->get('search', '');
        $status = $request->query->get('status', 'all');

        $qb = $entityManager->createQueryBuilder();
        $qb->select('u')
           ->from(User::class, 'u');

        if (!empty($search)) {
            $qb->andWhere('LOWER(u.prenom) LIKE :search
                           OR LOWER(u.nom) LIKE :search
                           OR LOWER(u.email) LIKE :search')
               ->setParameter('search', '%' . strtolower($search) . '%');
        }

        if ($status === 'active') {
            $qb->andWhere('u.actif = :actif')
               ->setParameter('actif', true);
        } elseif ($status === 'inactive') {
            $qb->andWhere('u.actif = :actif')
               ->setParameter('actif', false);
        }

        $qb->orderBy('u.prenom', 'ASC');

        $users = $qb->getQuery()->getResult();

        $data = array_map(function(User $user) {
            return [
                'id' => $user->getId(),
                'prenom' => $user->getPrenom(),
                'nom' => $user->getNom(),
                'email' => $user->getEmail(),
                'role' => $user->getRole(),
                'displayRole' => $user->getDisplayRole(),
                'roleColor' => $user->getRoleColor(),
                'roleIcon' => $user->getRoleIcon(),
                'actif' => $user->isActif(),
                'isSuperAdmin' => $user->isSuperAdmin(),
                'isCurrentUser' => $user->getId() === $this->getUser()->getId(),
                'initial' => substr($user->getPrenom(), 0, 1),
            ];
        }, $users);

        $activeCount = 0;
        $inactiveCount = 0;
        foreach ($users as $user) {
            if ($user->isActif()) {
                $activeCount++;
            } else {
                $inactiveCount++;
            }
        }

        return $this->json([
            'users' => $data,
            'total' => count($users),
            'activeCount' => $activeCount,
            'inactiveCount' => $inactiveCount,
        ]);
    }

    #[Route('/user/edit/{id}', name: 'app_user_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, User $user, EntityManagerInterface $entityManager, UserPasswordHasherInterface $passwordHasher): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $currentUser = $this->getUser();

        // Vérifier si l'utilisateur cible est un SUPER_ADMIN
        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            $this->addFlash('error', 'Vous n\'avez pas les droits pour modifier un Super Administrateur.');
            return $this->redirectToRoute('app_user');
        }

        // Un utilisateur ne peut pas modifier son propre compte
        if ($user->getId() === $currentUser->getId()) {
            $this->addFlash('error', 'Vous ne pouvez pas modifier votre propre compte.');
            return $this->redirectToRoute('app_user');
        }

        $form = $this->createForm(UserFormType::class, $user, [
            'method' => 'POST',
            'is_super_admin' => $this->isGranted('ROLE_SUPER_ADMIN'),
            'current_user_role' => $currentUser->getRole(),
        ]);

        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $plainPassword = $form->get('password')->getData();

            if (!empty($plainPassword)) {
                $hashedPassword = $passwordHasher->hashPassword($user, $plainPassword);
                $user->setPasswordHash($hashedPassword);
            }

            $entityManager->flush();

            $this->addFlash('success', 'L\'utilisateur a été modifié avec succès.');
            return $this->redirectToRoute('app_user');
        }

        if ($form->isSubmitted() && !$form->isValid()) {
            foreach ($form->getErrors(true) as $error) {
                $this->addFlash('error', $error->getMessage());
            }
        }

        return $this->render('user/edit.html.twig', [
            'user' => $user,
            'form' => $form->createView(),
            'is_super_admin' => $this->isGranted('ROLE_SUPER_ADMIN'),
        ]);
    }

    #[Route('/user/toggle-status/{id}', name: 'app_user_toggle_status', methods: ['POST'])]
    public function toggleStatus(User $user, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $currentUser = $this->getUser();

        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            $this->addFlash('error', 'Vous n\'avez pas les droits pour modifier un Super Administrateur.');
            return $this->redirectToRoute('app_user');
        }

        if ($user->getId() === $currentUser->getId()) {
            $this->addFlash('error', 'Vous ne pouvez pas modifier votre propre statut.');
            return $this->redirectToRoute('app_user');
        }

        $user->setActif(!$user->isActif());
        $entityManager->flush();

        $status = $user->isActif() ? 'activé' : 'désactivé';
        $this->addFlash('success', "L'utilisateur a été $status avec succès.");
        return $this->redirectToRoute('app_user');
    }

    #[Route('/user/delete/{id}', name: 'app_user_delete', methods: ['POST'])]
    public function delete(User $user, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $currentUser = $this->getUser();

        if ($user->getId() === $currentUser->getId()) {
            $this->addFlash('error', 'Vous ne pouvez pas supprimer votre propre compte.');
            return $this->redirectToRoute('app_user');
        }

        if ($user->isSuperAdmin() && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            $this->addFlash('error', 'Vous n\'avez pas les droits pour supprimer un Super Administrateur.');
            return $this->redirectToRoute('app_user');
        }

        $entityManager->remove($user);
        $entityManager->flush();

        $this->addFlash('success', 'L\'utilisateur a été supprimé avec succès.');
        return $this->redirectToRoute('app_user');
    }

    #[Route('/signup', name: 'app_signup', methods: ['GET', 'POST'])]
    public function signup(Request $request, EntityManagerInterface $entityManager, UserPasswordHasherInterface $passwordHasher, ValidatorInterface $validator): Response
    {
        $user = new User();

        if ($request->isMethod('POST')) {
            $prenom = $request->request->get('prenom');
            $nom = $request->request->get('nom');
            $email = $request->request->get('email');
            $password = $request->request->get('password');
            $passwordConfirm = $request->request->get('password_confirm');
            $acceptTerms = $request->request->get('accept_terms');

            $user->setPrenom($prenom);
            $user->setNom($nom);
            $user->setEmail($email);
            $user->setRole('ROLE_ADMIN');
            $user->setActif(true);
            $user->setDateCreation(new \DateTime());
            $user->setPlainPassword($password);

            $errors = $validator->validate($user);
            $errorMessages = [];

            if (count($errors) > 0) {
                foreach ($errors as $error) {
                    $errorMessages[] = $error->getMessage();
                }
            }

            if (empty($password) || strlen($password) < 6) {
                $errorMessages[] = 'Le mot de passe doit contenir au moins 6 caractères.';
            }

            if ($password !== $passwordConfirm) {
                $errorMessages[] = 'Les mots de passe ne correspondent pas.';
            }

            if (!$acceptTerms) {
                $errorMessages[] = 'Vous devez accepter la charte d\'utilisation.';
            }

            if (count($errorMessages) > 0) {
                $this->addFlash('error', implode('<br>', $errorMessages));
                return $this->redirectToRoute('app_login', ['register' => 'true']);
            }

            $hashedPassword = $passwordHasher->hashPassword($user, $password);
            $user->setPasswordHash($hashedPassword);

            $entityManager->persist($user);
            $entityManager->flush();

            $this->addFlash('success', 'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.');
            return $this->redirectToRoute('app_login');
        }

        return $this->redirectToRoute('app_login', ['register' => 'true']);
    }
      #[Route('/user/profile', name: 'app_user_profile')]
    #[Route('/user/send-verification-code', name: 'app_user_send_verification', methods: ['POST'])]
     #[Route('/user/send-verification-code', name: 'app_user_send_verification', methods: ['POST'])]
    public function sendVerificationCode(Request $request, EntityManagerInterface $entityManager, EmailService $emailService): JsonResponse
    {
        $user = $this->getUser();
        $newEmail = $request->request->get('email');

        if (!$user) {
            return $this->json(['success' => false, 'message' => 'Utilisateur non authentifié.'], 401);
        }

        if (!$newEmail || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['success' => false, 'message' => 'Adresse email invalide.'], 400);
        }

        // Vérifier si l'email est déjà utilisé
        $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $newEmail]);
        if ($existingUser && $existingUser->getId() !== $user->getId()) {
            return $this->json(['success' => false, 'message' => 'Cet email est déjà utilisé par un autre compte.']);
        }

        // Générer un code aléatoire à 6 chiffres
        $code = sprintf('%06d', random_int(100000, 999999));
        $request->getSession()->set('verification_code', $code);
        $request->getSession()->set('verification_email', $newEmail);
        $request->getSession()->set('verification_expires', time() + 900); // 15 minutes

        // Envoyer l'email via Brevo
        $sent = $emailService->sendVerificationCode($user, $newEmail, $code);

        if (!$sent) {
            return $this->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi de l\'email. Veuillez vérifier votre configuration Brevo.'
            ], 500);
        }

        return $this->json([
            'success' => true,
            'message' => 'Code de vérification envoyé à votre nouvelle adresse email.'
        ]);
    }

    #[Route('/test-email', name: 'app_test_email')]
    public function testEmail(EmailService $emailService): Response
    {
        $user = $this->getUser();

        if (!$user) {
            $this->addFlash('error', 'Vous devez être connecté pour tester l\'envoi d\'email.');
            return $this->redirectToRoute('app_login');
        }

        $sent = $emailService->sendVerificationCode($user, $user->getEmail(), '123456');

        if ($sent) {
            $this->addFlash('success', 'Email envoyé avec succès via Brevo !');
        } else {
            $this->addFlash('error', 'Erreur lors de l\'envoi de l\'email via Brevo. Vérifiez votre clé API.');
        }

        return $this->redirectToRoute('app_user_profile');
    }

    #[Route('/user/profile', name: 'app_user_profile', methods: ['GET', 'POST'])]
    public function profile(Request $request, EntityManagerInterface $entityManager, UserPasswordHasherInterface $passwordHasher, ValidatorInterface $validator): Response
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        if ($request->isMethod('POST')) {
            $prenom = $request->request->get('prenom');
            $nom = $request->request->get('nom');
            $email = $request->request->get('email');
            $currentPassword = $request->request->get('current_password');
            $newPassword = $request->request->get('new_password');
            $confirmPassword = $request->request->get('confirm_password');
            $verificationCode = $request->request->get('verification_code');

            $sessionCode = $request->getSession()->get('verification_code');
            $sessionEmail = $request->getSession()->get('verification_email');
            $sessionExpires = $request->getSession()->get('verification_expires');

            $errors = [];

            // Vérifier le mot de passe actuel
            if (empty($currentPassword) || !$passwordHasher->isPasswordValid($user, $currentPassword)) {
                $errors[] = 'Le mot de passe actuel est incorrect.';
            }

            // Valider les champs
            if (empty($prenom) || strlen($prenom) < 2) {
                $errors[] = 'Le prénom doit contenir au moins 2 caractères.';
            }
            if (empty($nom) || strlen($nom) < 2) {
                $errors[] = 'Le nom doit contenir au moins 2 caractères.';
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Veuillez saisir un email valide.';
            }

            // Vérifier si l'email est déjà utilisé par un autre utilisateur
            $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
            if ($existingUser && $existingUser->getId() !== $user->getId()) {
                $errors[] = 'Cet email est déjà utilisé par un autre compte.';
            }

            // Vérifier le code de vérification si l'email a changé
            if ($email !== $user->getEmail()) {
                // Vérifier si le code a expiré
                if (!$sessionExpires || time() > $sessionExpires) {
                    $errors[] = 'Le code de vérification a expiré. Veuillez en demander un nouveau.';
                } elseif (empty($verificationCode) || $verificationCode !== $sessionCode || $email !== $sessionEmail) {
                    $errors[] = 'Code de vérification invalide. Veuillez vérifier votre email.';
                }
            }

            // Vérifier le nouveau mot de passe
            if (!empty($newPassword)) {
                if (strlen($newPassword) < 6) {
                    $errors[] = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
                }
                if ($newPassword !== $confirmPassword) {
                    $errors[] = 'Les mots de passe ne correspondent pas.';
                }
            }

            if (count($errors) > 0) {
                $this->addFlash('error', implode('<br>', $errors));
                return $this->render('user/profile.html.twig', [
                    'user' => $user,
                ]);
            }

            // Mettre à jour les informations
            $user->setPrenom($prenom);
            $user->setNom($nom);
            $user->setEmail($email);

            if (!empty($newPassword)) {
                $hashedPassword = $passwordHasher->hashPassword($user, $newPassword);
                $user->setPasswordHash($hashedPassword);
            }

            $entityManager->flush();

            // Nettoyer la session
            $request->getSession()->remove('verification_code');
            $request->getSession()->remove('verification_email');
            $request->getSession()->remove('verification_expires');

            $this->addFlash('success', 'Votre profil a été mis à jour avec succès.');
            return $this->redirectToRoute('app_user_profile');
        }

        return $this->render('user/profile.html.twig', [
            'user' => $user,
        ]);

    }

}
