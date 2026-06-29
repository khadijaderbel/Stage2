<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class UserFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $isSuperAdmin = $options['is_super_admin'] ?? false;
        $currentUserRole = $options['current_user_role'] ?? 'ROLE_USER';

        $builder
            ->add('prenom', TextType::class, [
                'label' => 'Prénom',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Entrez le prénom'
                ],
                'constraints' => [
                    new NotBlank(['message' => 'Le prénom est obligatoire.']),
                    new Length([
                        'min' => 2,
                        'minMessage' => 'Le prénom doit contenir au moins 2 caractères.',
                        'max' => 255,
                        'maxMessage' => 'Le prénom ne doit pas dépasser 255 caractères.'
                    ])
                ]
            ])
            ->add('nom', TextType::class, [
                'label' => 'Nom',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Entrez le nom'
                ],
                'constraints' => [
                    new NotBlank(['message' => 'Le nom est obligatoire.']),
                    new Length([
                        'min' => 2,
                        'minMessage' => 'Le nom doit contenir au moins 2 caractères.',
                        'max' => 255,
                        'maxMessage' => 'Le nom ne doit pas dépasser 255 caractères.'
                    ])
                ]
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'exemple@novawin.com'
                ],
                'constraints' => [
                    new NotBlank(['message' => 'L\'email est obligatoire.']),
                ]
            ])
            ->add('password', PasswordType::class, [
                'label' => 'Mot de passe',
                'attr' => [
                    'class' => 'form-control',
                    'placeholder' => 'Entrez le mot de passe'
                ],
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new Length([
                        'min' => 6,
                        'minMessage' => 'Le mot de passe doit contenir au moins 6 caractères.',
                        'max' => 255,
                        'maxMessage' => 'Le mot de passe ne doit pas dépasser 255 caractères.'
                    ])
                ]
            ]);

        // Construction des choix de rôles selon les permissions
        $roleChoices = [
            'Utilisateur' => 'ROLE_USER',
            'Administrateur' => 'ROLE_ADMIN',
        ];

        // Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN
        if ($isSuperAdmin) {
            $roleChoices['Super Administrateur'] = 'ROLE_SUPER_ADMIN';
        }

        $builder->add('role', ChoiceType::class, [
            'label' => 'Rôle',
            'attr' => [
                'class' => 'form-control'
            ],
            'choices' => $roleChoices,
            'constraints' => [
                new NotBlank(['message' => 'Le rôle est obligatoire.']),
            ]
        ])
        ->add('actif', ChoiceType::class, [
            'label' => 'Statut',
            'attr' => [
                'class' => 'form-control'
            ],
            'choices' => [
                'Actif' => '1',
                'Inactif' => '0'
            ]
        ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'user_form',
            'is_super_admin' => false,
            'current_user_role' => 'ROLE_USER',
        ]);
    }
}
