# 🐾 BARK BATTLE

> Le premier jeu de combat d'aboiements multijoueur. Aboie plus fort. Domine la meute.

---

## 📋 Table des matières

1. [Aperçu](#aperçu)
2. [Architecture](#architecture)
3. [Stack technique](#stack-technique)
4. [Installation locale](#installation-locale)
5. [Docker](#docker)
6. [Structure du projet](#structure-du-projet)
7. [API Reference](#api-reference)
8. [Système ELO / RP](#système-elo--rp)
9. [Système de score](#système-de-score)
10. [WebRTC Audio](#webrtc-audio)
11. [Déploiement production](#déploiement-production)
12. [Sécurité & Anti-triche](#sécurité--anti-triche)

---

## Aperçu

Bark Battle est un jeu web multijoueur où les joueurs s'affrontent dans des duels d'aboiements via leur microphone. Le son est analysé en temps réel pour calculer un score basé sur l'intensité, le pic sonore, la durée et la régularité des aboiements.

### Modes de jeu
- **1v1 Classé** — Matchmaking automatique avec système ELO
- **Salon Privé** — Code d'invitation pour jouer entre amis
- **Contre l'IA** — 4 niveaux : Chiot, Chien de Garde, Loup Alpha, Cerbère

### Ligues
| Ligue | RP requis | Emoji |
|-------|-----------|-------|
| Os de Bronze | 0 | 🦴 |
| Niche d'Argent | 1,000 | 🏠 |
| Croquette d'Or | 2,000 | ✨ |
| Mâchoire Platine | 3,000 | 💎 |
| Alpha Diamant | 4,000 | 💠 |
| Roi des Chiens | 5,000 | 👑 |

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         NGINX (Reverse Proxy)    │
                    │    Rate limiting + SSL termination│
                    └─────────┬──────────┬────────────┘
                              │          │
              ┌───────────────▼──┐    ┌──▼──────────────────┐
              │  Next.js 15      │    │   NestJS Backend     │
              │  Frontend        │    │   REST + WebSocket   │
              │  (Vercel/Docker) │    │   (Railway/VPS)      │
              └──────────────────┘    └──────────┬──────────┘
                                                  │
                                    ┌─────────────┼──────────────┐
                                    │             │              │
                               ┌────▼───┐   ┌───▼────┐   ┌─────▼────┐
                               │Postgres│   │ Redis  │   │WebRTC    │
                               │(matchs │   │(queue  │   │STUN/TURN │
                               │ users) │   │sessions│   │(audio P2P│
                               └────────┘   └────────┘   └──────────┘
```

### Flux d'un match
```
Player A                    Server                   Player B
   │                          │                          │
   │── matchmaking:join ──────►│                          │
   │                          │◄── matchmaking:join ─────│
   │                          │                          │
   │◄── match:found ──────────│── match:found ──────────►│
   │                          │                          │
   │─── battle:join ──────────►│◄── battle:join ──────────│
   │                          │                          │
   │◄── battle:start ─────────┼── battle:start ─────────►│
   │                          │                          │
   │──── webrtc:offer ────────►│──── webrtc:offer ────────►│
   │◄── webrtc:answer ────────│◄── webrtc:answer ─────────│
   │                          │                          │
   │←══════════ Audio P2P (WebRTC) ═════════════════════►│
   │                          │                          │
   │── battle:volume ─────────►│── battle:volume-update ──►│
   │◄── battle:volume-update ─│◄── battle:volume ─────────│
   │                          │                          │
   │◄── battle:end ───────────┼── battle:end ────────────►│
```

---

## Stack technique

### Frontend
- **Next.js 15** avec App Router et Server Components
- **React 18** + TypeScript
- **TailwindCSS** + animations personnalisées
- **Framer Motion** pour les animations
- **Zustand** pour la gestion d'état
- **Socket.io Client** pour le temps réel
- **Web Audio API** pour la capture et l'analyse du son
- **WebRTC** pour la communication audio P2P

### Backend
- **NestJS** (Node.js) avec TypeScript
- **Prisma ORM** + **PostgreSQL**
- **Socket.io** pour les WebSockets (matchmaking + battle)
- **JWT** pour l'authentification
- **Passport.js** pour OAuth (Google, Discord)
- **Redis** pour les sessions et la file d'attente

### Infrastructure
- **Docker** + **Docker Compose**
- **Nginx** (reverse proxy, rate limiting)
- **Vercel** (frontend)
- **Railway** ou VPS (backend + BDD)

---

## Installation locale

### Prérequis
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- npm ou pnpm

### 1. Cloner et configurer

```bash
git clone <url>
cd bark-battle
cp .env.example .env
# Édite .env avec tes valeurs
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Le backend tourne sur `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend tourne sur `http://localhost:3000`

### 4. Seeder (optionnel)

```bash
cd backend
npx ts-node prisma/seed.ts
```

---

## Docker

### Développement

```bash
# Lancer PostgreSQL + Redis uniquement
docker compose up postgres redis -d

# Puis lancer backend/frontend en local
```

### Production complète

```bash
cp .env.example .env
# Édite .env avec tes vraies valeurs de production

docker compose up -d --build

# Vérifier les logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Services disponibles
| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001/api |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| Nginx | 80 | http://localhost |

---

## Structure du projet

```
bark-battle/
├── frontend/
│   ├── src/
│   │   ├── app/                  # Pages Next.js (App Router)
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/            # Auth (login + register)
│   │   │   ├── dashboard/        # Dashboard joueur
│   │   │   ├── matchmaking/      # Recherche de match
│   │   │   ├── battle/[id]/      # Arène de combat
│   │   │   ├── leaderboard/      # Classements
│   │   │   ├── profile/[id]/     # Profil joueur
│   │   │   └── shop/             # Boutique cosmétique
│   │   ├── components/
│   │   │   ├── battle/           # AudioVisualizer, BarkMeter, VictoryScreen
│   │   │   ├── layout/           # Navbar
│   │   │   └── ui/               # RankBadge, Button, etc.
│   │   ├── hooks/
│   │   │   ├── useAudio.ts       # Web Audio API
│   │   │   ├── useWebRTC.ts      # Connexion P2P audio
│   │   │   └── useSocket.ts      # Socket.io client
│   │   ├── lib/
│   │   │   ├── scoring.ts        # Calcul de score (frontend)
│   │   │   ├── api.ts            # Axios client
│   │   │   └── utils.ts          # Utilitaires
│   │   ├── store/                # Zustand stores
│   │   └── types/index.ts        # Types TypeScript partagés
│   └── Dockerfile
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Schéma BDD
│   ├── src/
│   │   ├── auth/                 # JWT + OAuth
│   │   ├── users/                # Profils, stats
│   │   ├── matches/              # Historique, finalisation
│   │   ├── matchmaking/          # Gateway WebSocket + file d'attente
│   │   ├── battle/               # Gateway WebSocket combat + WebRTC relay
│   │   ├── leaderboard/          # Classements global/hebdo/mensuel
│   │   ├── elo/                  # Calcul ELO/RP
│   │   ├── scoring/              # Validation serveur des scores
│   │   └── prisma/               # Service Prisma
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf                # Reverse proxy + rate limiting
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

### Auth
```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         (JWT requis)
```

### Users
```
GET  /api/users/:id           Profil public
GET  /api/users/:id/stats     Statistiques
```

### Matches
```
GET  /api/matches/history     Historique (paginé)
GET  /api/matches/:id         Détail d'un match
```

### Leaderboard
```
GET  /api/leaderboard/global   Top 100 mondial
GET  /api/leaderboard/weekly   Top hebdomadaire
GET  /api/leaderboard/monthly  Top mensuel
GET  /api/leaderboard/nearby   Joueurs proches en rang
```

### WebSocket Events

**Namespace `/matchmaking`**
```
Emit: matchmaking:join        { userId, rp }
Emit: matchmaking:leave
Emit: matchmaking:create-room { code, userId }
Emit: matchmaking:join-room   { code, userId }

On:   match:found             { matchId, isInitiator }
On:   match:error             { message }
On:   room:created            { code }
```

**Namespace `/battle`**
```
Emit: battle:join             { matchId, userId }
Emit: battle:volume           { matchId, volume }
Emit: battle:bonus            { matchId, bonus }
Emit: webrtc:offer            { matchId, offer }
Emit: webrtc:answer           { matchId, answer }
Emit: webrtc:ice-candidate    { matchId, candidate }

On:   battle:start            { matchId, player1Id, player2Id }
On:   battle:volume-update    { playerId, volume }
On:   battle:bonus            BonusEvent
On:   battle:end              { winner, player1Score, player2Score, ... }
On:   webrtc:offer/answer/ice-candidate
```

---

## Système ELO / RP

### Calcul des changements de RP

```typescript
// Probabilité de victoire attendue
P(A win) = 1 / (1 + 10^((RP_B - RP_A) / 400))

// Changement de RP
ΔRP_winner = K × (1 - P_expected)   // entre +20 et +35
ΔRP_loser  = K × (0 - P_expected)   // entre -10 et -25

// K factor = 32
// Bonus upset: +10 RP si on bat quelqu'un 300+ RP au-dessus
```

### Exemples
| Ton RP | Adversaire RP | Résultat | Gain |
|--------|--------------|----------|------|
| 1000 | 1000 | Victoire | +20 RP |
| 1000 | 1500 | Victoire | +30 RP (upset) |
| 1500 | 1000 | Victoire | +15 RP |
| 1000 | 1000 | Défaite | -15 RP |

---

## Système de score

Le score de chaque manche est calculé ainsi :

```
Score = (
  Volume moyen × 0.35 +
  Pic sonore   × 0.25 +
  Durée d'aboi × 0.25 +
  Régularité   × 0.15
) × Multiplicateur de bonus
```

### Bonus aléatoires

| Bonus | Multiplicateur | Déclencheur |
|-------|---------------|-------------|
| 🐕 Aboiement Chihuahua | ×1.3 | Volume < 30% |
| 💢 Rage Berger Allemand | ×1.5 | Volume > 80% |
| 🌕 Hurlement Lunaire | ×1.4 | Volume > 70% |
| 👑 Alpha Dominant | ×1.6 | Volume > 90% |
| 🌟 Joie du Golden | ×1.2 | Aléatoire |
| 🎭 Drama du Husky | ×1.35 | Aléatoire |

---

## WebRTC Audio

L'audio entre joueurs est transmis en **P2P via WebRTC**, ce qui garantit une faible latence et respecte la vie privée (les données audio ne transitent pas par le serveur).

### Flux de connexion
1. Le serveur met en relation les deux joueurs via les WebSockets
2. Le joueur initiateur crée une `RTCPeerConnection` et envoie une `offer`
3. Le serveur relaie l'offer (signaling)
4. Le second joueur répond avec une `answer`
5. Les ICE candidates sont échangés
6. La connexion P2P est établie

### STUN servers utilisés
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

> Pour la production, ajouter un serveur **TURN** (coturn) pour les joueurs derrière un NAT strict.

---

## Déploiement production

### Frontend — Vercel

```bash
cd frontend
vercel deploy --prod

# Variables d'environnement sur Vercel:
# NEXT_PUBLIC_API_URL=https://api.ton-domaine.com/api
# NEXT_PUBLIC_WS_URL=https://api.ton-domaine.com
```

### Backend — Railway

```bash
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "npx prisma migrate deploy && node dist/main"

# Variables d'env sur Railway:
# DATABASE_URL (fourni automatiquement si PostgreSQL Railway)
# JWT_SECRET
# FRONTEND_URL
# REDIS_URL
```

### VPS (DigitalOcean / OVH / etc.)

```bash
# 1. Installer Docker
curl -fsSL https://get.docker.com | sh

# 2. Cloner le projet
git clone <url> /opt/bark-battle
cd /opt/bark-battle

# 3. Configurer .env
cp .env.example .env
nano .env  # Remplir les valeurs

# 4. Lancer
docker compose up -d --build

# 5. SSL avec Let's Encrypt (optionnel)
docker run -it --rm \
  -v /opt/bark-battle/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d barkbattle.com -d www.barkbattle.com
```

### Checklist production
- [ ] `JWT_SECRET` long et aléatoire (min 64 chars)
- [ ] `POSTGRES_PASSWORD` fort
- [ ] HTTPS activé (Let's Encrypt)
- [ ] Variables d'env configurées sur la plateforme
- [ ] Migrations Prisma appliquées (`prisma migrate deploy`)
- [ ] Firewall : seuls les ports 80/443 exposés publiquement
- [ ] Backups PostgreSQL automatiques
- [ ] TURN server configuré (coturn) pour WebRTC en production

---

## Sécurité & Anti-triche

### Mesures implémentées

1. **Validation serveur des scores** — Le backend recalcule indépendamment le score. Un score "trop parfait" (avgVolume > 98% pendant 25s+ avec consistency > 99%) est détecté et annulé.

2. **Rate limiting** — 30 requêtes/min sur l'API, 10/min sur les endpoints auth.

3. **Anti-farming RP** — Un même duel (même paire de joueurs) ne peut pas être répété plus de 3 fois par heure.

4. **Validation JWT** — Tous les endpoints sont protégés. Les WebSockets vérifient le token à la connexion.

5. **Whitelist d'inputs** — `class-validator` avec `whitelist: true` rejette tous les champs non déclarés dans les DTOs.

6. **Helmet** — Headers de sécurité HTTP automatiques.

7. **Bans** — Le champ `isBanned` permet de bloquer un compte sans le supprimer.

### Anti-triche audio (à implémenter en production)
- Analyse des patterns d'onde (sons pré-enregistrés ont une forme trop régulière)
- Vérification de la cohérence volume/durée côté serveur
- Report de joueurs suspects avec système de review

---

## Développement

```bash
# Lancer tout en local (dev)
cd backend && npm run start:dev &
cd frontend && npm run dev

# Tests
cd backend && npm test
cd frontend && npm test

# Prisma Studio (interface BDD)
cd backend && npx prisma studio

# Générer une migration
cd backend && npx prisma migrate dev --name nom_migration
```

---

*Fait avec ❤️ et beaucoup d'aboiements 🐾*
