<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:create-super-admin')]
class CreateSuperAdminCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->setDescription('Crée un utilisateur SUPER_ADMIN')
            ->addArgument('email', InputArgument::REQUIRED, 'Email du SUPER_ADMIN')
            ->addArgument('prenom', InputArgument::REQUIRED, 'Prénom')
            ->addArgument('nom', InputArgument::REQUIRED, 'Nom');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $helper = $this->getHelper('question');

        $email = $input->getArgument('email');
        $prenom = $input->getArgument('prenom');
        $nom = $input->getArgument('nom');

        // Vérifier si l'email existe déjà
        $existingUser = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            $output->writeln('<error>Un utilisateur avec cet email existe déjà.</error>');
            return Command::FAILURE;
        }

        // Demander le mot de passe
        $passwordQuestion = new Question('Mot de passe (minimum 6 caractères): ');
        $passwordQuestion->setHidden(true);
        $passwordQuestion->setHiddenFallback(false);
        $password = $helper->ask($input, $output, $passwordQuestion);

        if (strlen($password) < 6) {
            $output->writeln('<error>Le mot de passe doit contenir au moins 6 caractères.</error>');
            return Command::FAILURE;
        }

        // Créer l'utilisateur
        $user = new User();
        $user->setEmail($email);
        $user->setPrenom($prenom);
        $user->setNom($nom);
        $user->setRole('ROLE_SUPER_ADMIN');
        $user->setActif(true);
        $user->setDateCreation(new \DateTime());

        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPasswordHash($hashedPassword);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $output->writeln('<info>✅ SUPER_ADMIN créé avec succès !</info>');
        $output->writeln(sprintf('Email: %s', $email));
        $output->writeln(sprintf('Nom: %s %s', $prenom, $nom));
        $output->writeln('Rôle: ROLE_SUPER_ADMIN');

        return Command::SUCCESS;
    }
}
