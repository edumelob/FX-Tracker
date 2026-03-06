# 💱 FX Tracker

> A production-ready currency exchange rate tracker and smart price alert system. Monitor live FX rates across 10 major currencies, set directional price alerts, and convert amounts in real time — all through a clean dark-mode dashboard backed by a FastAPI service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.12, FastAPI, Pydantic v2, httpx |
| Frontend | React 18, Vite, custom hooks |
| Testing (backend) | pytest, pytest-asyncio, pytest-cov |
| Testing (frontend) | Vitest, @testing-library/react |
| CI/CD | GitHub Actions |
| Exchange Rate Data | [ExchangeRate-API](https://www.exchangerate-api.com/) (with mock fallback) |

---

## Prerequisites

- **Python** ≥ 3.12
- **Node.js** ≥ 20 and **npm** ≥ 10
- (Optional) An API key from [exchangerate-api.com](https://www.exchangerate-api.com/) — the app works without one using deterministic mock data.

---

## Setup & Running

### 1. Clone the repository

```bash
git clone https://github.com/your-username/fx-tracker.git
cd fx-tracker
```

### 2. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env if you have a real API key; leave EXCHANGE_RATE_API_KEY=demo for mock mode.

# Start the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies /api → localhost:8000 automatically)
npm run dev
```

The UI will open at `http://localhost:5173`.

---

## Running the Tests

### Backend

```bash
cd backend
pytest                          # Run all tests
pytest --cov=app -v             # With coverage report
```

### Frontend

```bash
cd frontend
npm test                        # Run all tests once
npm run test:watch              # Re-run on file changes
npm run test:coverage           # With coverage report
```

---

## CI/CD Pipeline

The `.github/workflows/ci.yml` workflow runs automatically on every **push** and **pull request** to `main`.

```
Push / PR to main
       │
       ├── Backend job
       │     ├── Setup Python 3.12
       │     ├── pip install (cached)
       │     └── pytest --cov
       │
       ├── Frontend job
       │     ├── Setup Node.js 20
       │     ├── npm ci (cached)
       │     └── npm test
       │
       └── Summary gate (requires both jobs to pass)
```

Both jobs run in parallel. The summary gate (`all-checks-pass`) ensures the PR merge button stays locked until every check is green.

---

## Folder Structure

```
fx-tracker/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI pipeline
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── alerts.py    # Alert CRUD endpoints
│   │   │       └── rates.py     # Rate query & conversion endpoints
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings (env vars)
│   │   │   └── exceptions.py    # Domain-specific exception classes
│   │   ├── models/
│   │   │   ├── alert.py         # Alert Pydantic schemas
│   │   │   └── rate.py          # Rate Pydantic schemas
│   │   ├── services/
│   │   │   ├── alert_service.py # Alert business logic & store
│   │   │   └── rate_service.py  # Rate fetching & conversion logic
│   │   └── main.py              # FastAPI app factory
│   ├── tests/
│   │   └── test_fx_tracker.py   # Full test suite (unit + integration)
│   ├── .env.example
│   ├── pytest.ini
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── setup.js
│   │   │   └── fx-tracker.test.jsx   # Component & utility tests
│   │   ├── components/
│   │   │   ├── AlertForm.jsx    # Controlled form for creating alerts
│   │   │   ├── AlertList.jsx    # Alert list with cancel controls
│   │   │   └── RateCard.jsx     # Single currency rate card
│   │   ├── hooks/
│   │   │   ├── useAlerts.js     # Alert CRUD hook
│   │   │   └── useExchangeRates.js  # Rate fetching + auto-refresh hook
│   │   ├── utils/
│   │   │   ├── api.js           # Centralized API client
│   │   │   └── formatters.js    # Currency & time formatting utilities
│   │   ├── App.jsx              # Root component & tab routing
│   │   ├── main.jsx             # React entry point
│   │   └── styles.css           # Global dark-theme stylesheet
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .env.example
├── .gitignore
└── README.md
```

---

## What Makes This Project Special

### Architecture & Clean Code

**Single responsibility, top to bottom.** Every Python module has one job: `rate_service.py` fetches and transforms rates; `alert_service.py` manages alert state; the route files are thin controllers that only map HTTP to service calls. This makes adding a database later as simple as swapping the service layer — no changes to routes or models.

**Named exceptions over magic strings.** The backend raises `UnsupportedCurrencyError`, `AlertNotFoundError`, and `AlertLimitExceededError` instead of generic `ValueError`. Routers catch specific types and return the correct HTTP status code automatically.

**Pydantic v2 for zero-cost validation.** Every API input is validated, normalized (currency codes are always uppercased), and documented automatically via FastAPI's OpenAPI output. The `.env` file is parsed by `pydantic-settings` with the same type-safety.

**Custom React hooks as the seam between UI and data.** `useExchangeRates` and `useAlerts` isolate all async logic — loading state, error handling, auto-refresh intervals — so components stay pure and easy to test.

### Testing Philosophy

The backend test suite covers three independent layers: pure service unit tests (no HTTP), API integration tests via `TestClient` (no real server), and edge-case coverage (alert limits, cross-rate consistency, already-triggered guards). Frontend tests use `@testing-library/react` to test *behavior* (what the user sees and can do), not implementation details.

### No API Key Required

The mock fallback in `rate_service.py` uses real cross-rate math, so the app behaves correctly even without a live API key. This makes local development and CI friction-free, and demonstrates defensive design thinking hiring managers notice.
