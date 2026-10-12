# NOVAWIN

Backoffice de gestion de catalogue produits e-commerce, avec génération et amélioration automatique des fiches produits par intelligence artificielle.

Projet réalisé dans le cadre d'un stage d'immersion en entreprise chez **DECADE Tunisie**, encadré par Mr Edem Kessentini.

---

## Sommaire

- [Aperçu](#aperçu)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Accès aux services](#accès-aux-services)
- [Fonctionnalités](#fonctionnalités)
- [Structure du projet](#structure-du-projet)
- [Commandes utiles](#commandes-utiles)
- [Notes techniques](#notes-techniques)

---

## Aperçu

NOVAWIN permet à une équipe e-commerce de :
- gérer un catalogue de produits et de catégories ;
- importer un catalogue en masse depuis un fichier CSV, Excel ou JSON, avec application automatique de règles métier (catégories manquantes, correction de format, mise à jour par SKU) ;
- exporter le catalogue aux formats CSV, Excel, JSON ou PDF ;
- générer ou régénérer automatiquement la description d'un produit grâce à l'IA, à partir de son nom, de ses caractéristiques et, si disponible, de son image ;
- suivre l'activité du catalogue via un tableau de bord et un historique des imports.

L'application distingue deux rôles administrateurs :

| Rôle fonctionnel | Rôle technique (code) | Accès |
|---|---|---|
| Admin Superviseur | `ROLE_SUPER_ADMIN` | Ensemble des modules (produits, catégories, utilisateurs, imports, tableau de bord) |
| Admin Sécurité | `ROLE_ADMIN` | Gestion des comptes utilisateurs uniquement |



---

## Stack technique

| Couche | Technologie |
|---|---|
| Back-end | Symfony 7 (PHP 8.3), API REST stateless |
| Authentification | JWT via `LexikJWTAuthenticationBundle` |
| Front-end | Next.js 16 (App Router, TypeScript) |
| Base de données | MySQL 8 (`winova`), Doctrine ORM |
| Génération IA | Gemini (fournisseur principal) + Groq (bascule automatique en cas d'échec) |
| UI | Bootstrap 5, SweetAlert2, Chart.js |
| Déploiement | Docker & Docker Compose |

---

## Architecture

L'application repose sur une architecture découplée : le front-end Next.js consomme exclusivement l'API Symfony via des requêtes HTTP authentifiées par jeton JWT, sans état de session côté serveur.

En environnement Docker, la solution est composée de **5 services** :

```
Navigateur
   │
   ├── :3000 ───► frontend  (Next.js)
   │
   └── :8090 ───► nginx  ───► php (Symfony)  ───► database (MySQL)
                                                        │
                    adminer (:8081) ─────────────────────┘
```

- `php` — conteneur PHP-FPM exécutant l'API Symfony ;
- `nginx` — reverse proxy vers le back-end ;
- `database` — instance MySQL ;
- `adminer` — interface d'administration de la base de données ;
- `frontend` — application Next.js (mode développement).

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (inclut Docker Compose)
- [Git](https://git-scm.com/)

Aucune installation locale de PHP, Node.js ou MySQL n'est nécessaire : tout tourne dans les conteneurs.

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-depot> novawin
cd novawin
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
cp novawin-back/.env.local.example novawin-back/.env.local
cp novawin-front/.env.local.example novawin-front/.env.local
```

Éditer `novawin-back/.env.local` et renseigner :
- `JWT_PASSPHRASE` : une phrase secrète de votre choix ;
- `GEMINI_API_KEY` : clé obtenue sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) ;
- `GROQ_API_KEY` : clé obtenue sur [console.groq.com/keys](https://console.groq.com/keys).

### 3. Générer les clés JWT

```bash
docker compose run --rm php php bin/console lexik:jwt:generate-keypair
```

### 4. Démarrer l'application

```bash
docker compose up -d --build
```

Au premier démarrage, si un fichier `.sql` est présent dans `docker/mysql/init/`, il est automatiquement importé dans la base de données.

### 5. Créer un compte administrateur

```bash
docker compose exec php php bin/console app:create-super-admin admin@novawin.com Prenom Nom
```

Le mot de passe est demandé de façon interactive (saisie masquée).

---

## Variables d'environnement

| Fichier | Variable | Description |
|---|---|---|
| `novawin/.env` | `DB_HOST_PORT` | Port hôte exposé pour MySQL (défaut : `3309`) |
| `novawin/.env` | `BACKEND_PORT` | Port hôte exposé pour l'API (défaut : `8090`) |
| `novawin-back/.env.local` | `DATABASE_URL` | Chaîne de connexion à la base (hôte interne : `database`) |
| `novawin-back/.env.local` | `JWT_SECRET_KEY` / `JWT_PUBLIC_KEY` / `JWT_PASSPHRASE` | Clés de signature des jetons JWT |
| `novawin-back/.env.local` | `GEMINI_API_KEY` / `GROQ_API_KEY` | Clés des fournisseurs IA |
| `novawin-back/.env.local` | `CORS_ALLOW_ORIGIN` | Origine autorisée pour les requêtes cross-origin (front-end) |
| `novawin-front/.env.local` | `NEXT_PUBLIC_API_URL` | URL publique de l'API, utilisée par le navigateur |
| `docker-compose.yml` | `INTERNAL_API_URL` | URL interne de l'API (réseau Docker), utilisée par les appels côté serveur Next.js |

⚠️ Aucun de ces fichiers `.env.local` n'est versionné (voir `.gitignore`) — les fichiers `.env.local.example` servent uniquement de modèle.

---

## Accès aux services

| Service | URL | Identifiants |
|---|---|---|
| Application (front-end) | http://localhost:3000 | Compte créé via `app:create-super-admin` |
| API (back-end) | http://localhost:8090/api | Authentification par jeton JWT |
| Adminer (base de données) | http://localhost:8081 | Serveur `database`, utilisateur/mot de passe définis dans `docker-compose.yml` |

---

## Fonctionnalités

- **Authentification** — connexion/inscription, jetons JWT, gestion des rôles.
- **Utilisateurs** — CRUD complet, activation/désactivation des comptes.
- **Catégories** — CRUD complet, recherche et tri.
- **Produits** — CRUD complet, génération/régénération de description par IA.
- **Import** — CSV, Excel, JSON ; détection des catégories manquantes ; correction automatique du format des caractéristiques ; mise à jour complète des produits existants par SKU.
- **Export** — CSV, Excel, JSON, PDF, avec filtres et prévisualisation.
- **Tableau de bord** — indicateurs clés, graphiques (Chart.js).
- **Historique d'import** — journal des imports, prévisualisation et téléchargement des fichiers, suppression.

---

## Structure du projet

```
novawin/
├── docker/
│   ├── php/Dockerfile
│   ├── nginx/default.conf
│   ├── frontend/Dockerfile
│   └── mysql/init/            # scripts .sql auto-importés au 1er démarrage
├── novawin-back/               # API Symfony
│   ├── src/Controller/
│   ├── src/Entity/
│   └── src/Service/            # AiProviderManager, GeminiService, GroqService...
├── novawin-front/               # Application Next.js
│   ├── src/app/
│   ├── src/components/
│   └── src/lib/                 # api.ts, auth.ts, aiProvider.ts
├── docker-compose.yml
└── .env
```

---

## Commandes utiles

```bash
docker compose up -d              # démarrer tous les services
docker compose down                # arrêter tous les services
docker compose down -v             # arrêter et réinitialiser les volumes (⚠ supprime les données)
docker compose logs -f <service>   # suivre les logs d'un service (php, frontend, nginx...)
docker compose exec php bash       # ouvrir un shell dans le conteneur back-end
docker compose exec php php bin/console cache:clear
docker compose ps                  # état des services
```

---

## Notes techniques

- **Durée de vie des jetons JWT** : 1 heure par défaut. Configurable via `token_ttl` dans `novawin-back/config/packages/lexik_jwt_authentication.yaml`.
- **Résolution des URLs côté Next.js** : les appels effectués depuis le navigateur utilisent `NEXT_PUBLIC_API_URL` (URL publique) ; les appels effectués depuis le serveur Next.js (Server Components) utilisent `INTERNAL_API_URL` (résolue via le réseau Docker interne). Ne pas confondre les deux au risque d'obtenir une erreur `fetch failed` en environnement conteneurisé.
- **`node_modules`** : isolé du montage du dossier `novawin-front` via un volume anonyme, afin d'éviter les conflits entre paquets compilés pour Windows et paquets compilés pour Linux (conteneur).

---

## Auteur

**Khadija Derbel** — Stage d'immersion en entreprise, ESPRIT, 3ème → 4ème année.
Réalisé chez DECADE Tunisie, du 15 juin au 31 juillet 2026, sous la supervision de Mr Edem Kessentini.
