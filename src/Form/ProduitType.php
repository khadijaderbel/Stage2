<?php

namespace App\Form;

use App\Entity\Categorie;
use App\Entity\Produit;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ProduitType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('sku', TextType::class, [
                'label' => 'SKU',
                'attr'  => ['id' => 'skuInput', 'placeholder' => 'Ex: NW-PROD-01'],
            ])
            ->add('nom', TextType::class, [
                'label' => 'Nom du produit',
                'attr'  => ['id' => 'nomInput', 'placeholder' => 'Ex: Casque Wireless Pro'],
            ])
            ->add('statut', ChoiceType::class, [
                'label'   => 'Statut',
                'choices' => [
                    'Actif'   => 'actif',
                    'Inactif' => 'inactif',
                    'Rupture' => 'rupture',
                ],
                'attr' => ['id' => 'statutInput'],
            ])
            ->add('categorie', EntityType::class, [
                'label'        => 'Catégorie',
                'class'        => Categorie::class,
                'choice_label' => 'nom',
                'placeholder'  => '— Choisir une catégorie —',
                'attr'         => ['id' => 'categorieInput'],
            ])
            ->add('imageUrl', TextType::class, [
                'label'    => "URL de l'image",
                'required' => false,
                'attr'     => ['id' => 'imageUrlInput', 'placeholder' => 'https://...'],
            ])
            ->add('caracteristiques', TextareaType::class, [
                'label'    => 'Caractéristiques',
                'required' => false,
                'attr'     => ['rows' => 3, 'placeholder' => 'Caractéristiques techniques...'],
            ])
            ->add('descriptionOriginale', TextareaType::class, [
                'label'    => 'Description originale',
                'required' => false,
                'attr'     => ['rows' => 3],
            ])
            ->add('descriptionGeneree', TextareaType::class, [
                'label'    => 'Description générée (IA)',
                'required' => false,
                'attr'     => ['rows' => 3],
            ]);

        $builder->addEventListener(FormEvents::PRE_SUBMIT, function (FormEvent $event) {
            $data = $event->getData();
            if (isset($data['sku'])) $data['sku'] = strtoupper(trim($data['sku']));
            if (isset($data['nom'])) $data['nom'] = trim($data['nom']);
            $event->setData($data);
        });
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => Produit::class]);
    }
}
