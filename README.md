<div align="center">

# 🌌 Quantum Learning System (QLS)

**An interactive platform for mastering quantum mechanics — through live simulations, adaptive quizzes, a navigable knowledge graph, and an AI tutor powered by Claude.**

Wrapped in a *deep-space galaxies + quartz crystal* interface.

![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.17-A30000?logo=django&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.6-37814A?logo=celery&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Claude-D97757?logo=anthropic&logoColor=white)

</div>

---

## ✨ Features

- **🪐 Live physics simulations** — interactive canvas renderings of the double-slit experiment, particle-in-a-box eigenstates, time-evolving wavefunctions (finite-difference Schrödinger), and quantum tunneling (analytic T/R coefficients). Heavyweight computations run server-side on Celery; lightweight ones render client-side.
- **🔭 Knowledge graph** — a force-directed, drag-to-explore map of how quantum concepts depend on one another, with click-through navigation.
- **🤖 AI tutor** — chat with Claude about any concept. Responses are **difficulty-aware** (beginner / intermediate / advanced) and render LaTeX math inline. Generation is async (Celery + polling) so the UI never blocks.
- **🧪 Adaptive quizzes** — multiple-choice, true/false, and numerical-answer questions with tolerance-based grading, per-question explanations, and an XP / streak progression system.
- **📚 Concept library** — searchable, filterable catalog of quantum topics with prerequisites and categories.
- **🌌 Galaxy/quartz UI** — a living spiral-galaxy background (golden-angle Fibonacci phyllotaxis), nebula gradients, and frosted crystalline cards with prismatic edges.

---

## 🏛️ Architecture

```
                          ┌─────────────────────────────┐
                          │      nginx  (:80 / :443)     │
                          │  rate-limiting · CSP · proxy │
                          └───────────────┬─────────────┘
                        /api/*  │                 │  /*
                  ┌─────────────▼──────┐   ┌──────▼──────────────┐
                  │  Django + DRF      │   │  Next.js 16 (SSR)   │
                  │  (gunicorn)        │   │  React 19           │
                  └──┬───────┬─────────┘   └─────────────────────┘
                     │       │
          ┌──────────▼──┐  ┌─▼──────────────┐
          │ PostgreSQL  │  │     Redis      │
          │   (Neon /   │  │ cache + broker │
          │   pg16)     │  └─┬────────────┬─┘
          └─────────────┘    │            │
                    ┌────────▼───┐  ┌─────▼────────┐
                    │ celery     │  │ celery beat  │
                    │ worker     │  │ (scheduler)  │
                    │ default ·  │  └──────────────┘
                    │ simulations·│
                    │ ai_tasks   │ ──► Anthropic API (Claude)
                    └────────────┘
```

**Celery queues:** `default`, `simulations` (numpy/scipy physics), `ai_tasks` (Claude calls) — isolated so a slow AI request never blocks a simulation.

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript 6 · Tailwind CSS 4 (CSS-first) · TanStack Query · Zustand · React Hook Form + Zod 4 · KaTeX · Canvas 2D |
| **Backend** | Django 6 · Django REST Framework 3.17 · SimpleJWT (httpOnly cookies) · Celery 5.6 · NumPy / SciPy / scikit-learn |
| **Data** | PostgreSQL 16 (NeonDB-ready) · Redis 7 (cache + broker + result backend) |
| **AI** | Anthropic Claude (`anthropic` SDK, adaptive thinking) |
| **Infra** | Docker Compose · nginx · WhiteNoise · Cloudinary (media) · Sentry (monitoring) |
| **Security** | Argon2 hashing · JWT rotation + blacklist · django-ratelimit · bleach sanitization · magic-byte upload validation · CSP / HSTS |

---

## 🚀 Quick Start (Docker — recommended)

**Prerequisites:** Docker + Docker Compose.

```bash
# 1. Clone
git clone <repo-url> Quantum_theory_learner
cd Quantum_theory_learner

# 2. Configure environment
cp .env.example .env
#    → edit .env: set DJANGO_SECRET_KEY, ANTHROPIC_API_KEY, and either
#      DATABASE_URL (Neon/external pg) or the POSTGRES_* vars (local pg)

# 3. Build & launch the full stack
docker compose up --build

# 4. Run migrations (first boot)
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

| Service | URL |
|---|---|
| App (via nginx) | http://localhost |
| API root | http://localhost/api |
| Django admin | http://localhost/api/admin/ |

---

## 💻 Local Development (without Docker)

<details>
<summary><strong>Backend</strong></summary>

```bash
cd backend
python3.13 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Requires a reachable PostgreSQL + Redis (DATABASE_URL / REDIS_URL in .env)
python manage.py migrate
python manage.py runserver            # http://localhost:8000

# In separate shells — the Celery worker & scheduler:
celery -A qls worker -l info -Q default,simulations,ai_tasks
celery -A qls beat  -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
</details>

<details>
<summary><strong>Frontend</strong></summary>

```bash
cd frontend
npm install
cp .env.local.example .env.local      # set NEXT_PUBLIC_API_URL (e.g. http://localhost:8000/api)
npm run dev                           # http://localhost:3000
```
</details>

---

## 🔑 Environment Variables

Copy `.env.example` → `.env`. Key values:

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret (use a 50+ char random string) |
| `DJANGO_SETTINGS_MODULE` | `qls.settings.development` or `qls.settings.production` |
| `DATABASE_URL` | Full Postgres URL (NeonDB, RDS, …). Takes priority over `POSTGRES_*` |
| `POSTGRES_DB/USER/PASSWORD/HOST/PORT` | Local Docker Postgres (used when `DATABASE_URL` is empty) |
| `REDIS_URL` / `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis endpoints |
| `ANTHROPIC_API_KEY` | Claude API key for the AI tutor |
| `ANTHROPIC_MODEL` | Model id (default `claude-sonnet-4-6`) |
| `CLOUDINARY_*` | Media storage credentials |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` / `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Token lifetimes |

> ⚠️ `.env` is gitignored — never commit real secrets.

---

## 🛰️ API Overview

All endpoints are namespaced under `/api`. Auth uses **httpOnly JWT cookies** (no tokens in JS).

| Group | Example endpoints |
|---|---|
| **Auth** `/api/auth/` | `register/`, `login/`, `logout/`, `token/refresh/`, `me/`, `progress/`, `password/change/` |
| **Concepts** `/api/concepts/` | `` (list), `<id>/`, `knowledge-graph/` |
| **Simulations** `/api/simulations/` | `run/`, `<id>/`, `` (history) |
| **Quizzes** `/api/quizzes/` | ``, `<id>/`, `<id>/start/`, `attempts/<id>/submit/`, `my-attempts/` |
| **AI Tutor** `/api/ai/` | `conversations/`, `conversations/<id>/`, `.../messages/`, `.../messages/<id>/` |

---

## 🗂️ Project Structure

```
Quantum_theory_learner/
├── backend/
│   ├── qls/                    # Django project (settings, celery, urls)
│   │   └── settings/           # base · development · production
│   ├── apps/
│   │   ├── core/               # base models, permissions, validators, exceptions
│   │   ├── users/              # custom user, JWT cookie auth, progress/XP
│   │   ├── concepts/           # categories, concepts, knowledge-graph edges
│   │   ├── simulations/        # physics Celery tasks (numpy/scipy)
│   │   ├── quizzes/            # quizzes, questions, grading, attempts
│   │   └── ai_tutor/           # conversations, messages, Claude tasks
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/                # App Router pages (dashboard, concepts, quiz, tutor, …)
│       ├── components/         # layout · auth · simulations · tutor
│       └── lib/                # api clients · hooks · zustand store · utils
├── nginx/                      # reverse proxy, rate-limit zones, CSP
├── docker-compose.yml
└── .env.example
```

---

## 🧪 Testing

```bash
cd backend
pytest                 # run the suite
pytest --cov=apps      # with coverage
```

```bash
cd frontend
npm run type-check     # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
```

---

## 🔒 Security

- **Passwords** hashed with **Argon2**.
- **JWT** access/refresh tokens stored in **httpOnly, Secure, SameSite cookies**; refresh rotation with blacklist on logout.
- **Rate limiting** (nginx zones + `django-ratelimit`): stricter on auth (5/min) and AI (10/min) endpoints.
- **Input hardening**: bleach HTML sanitization, magic-byte image-upload validation, DRF serializer whitelists.
- **Headers**: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, referrer policy.
- **No stack traces** leaked — a custom exception handler returns generic 500s.
- **RBAC** via DRF permission classes (owner/admin/read-only).

---

## 📐 The Physics (selected)

- **Particle in a box** — eigenstates ψₙ(x) = √(2/L)·sin(nπx/L), energies Eₙ ∝ n².
- **Quantum tunneling** — rectangular-barrier transmission T = [1 + V₀²·sinh²(κa)/(4E(V₀−E))]⁻¹.
- **Wavefunction evolution** — finite-difference integration of the time-dependent Schrödinger equation for a Gaussian packet (dispersive spreading, Δx·Δp ≥ ℏ/2).
- **Double-slit** — single-slit envelope × double-slit fringes, with rejection-sampled particle accumulation building the interference pattern.

---

<div align="center">

*Built with Django, Next.js, and Claude.* ✦

</div>
