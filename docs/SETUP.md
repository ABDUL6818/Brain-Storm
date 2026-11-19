# Developer Setup and Local Deployment Guide

This guide captures the key decisions and usage for `README.md`, `docker-compose*.yml`, and the supporting setup scripts so that new contributors and API consumers can onboard without tribal knowledge. It is the canonical reference for getting the project running locally.

> **Related:** This document is part of the documentation effort tracked in issue #1429 and is related to #2.

---

## 1. Context

The project ships with several moving parts:

- **Smart contracts** (Solidity) that must be compiled and deployed to a local chain.
- **A backend API** that indexes and serves contract data.
- **A frontend** that consumes the API.
- **Docker Compose** files (`docker-compose.yml` and any overrides) that orchestrate the local stack.
- **Setup scripts** (`scripts/setup.sh`) that bootstrap the environment.

Historically, the knowledge required to wire these together lived in the heads of a few maintainers. This guide exists to make that knowledge explicit, reproducible, and verifiable.

## 2. Decision

We standardize on a **single, scripted, container-first local workflow**:

1. **Prerequisites are pinned** and checked by `scripts/setup.sh`.
2. **Environment variables** are centralized in `.env` (copied from `.env.example`) and consumed by both Docker Compose and the application processes.
3. **Docker Compose is the default** way to run the full stack locally. Running services natively (without Docker) is supported but documented as a secondary path.
4. **Every command in this guide is runnable end-to-end** and its expected output is recorded below so contributors can self-verify.

## 3. Consequences

- **Positive:** New contributors can go from clone to running stack with a small, documented set of commands. API consumers have a clear description of how to bring up a local instance to test against.
- **Positive:** Because commands are verified, drift between docs and reality is caught early.
- **Negative:** The guide must be maintained alongside `docker-compose*.yml` and `scripts/setup.sh`. Changes to those files should trigger a review of this document.
- **Negative:** Docker is now effectively required for the "happy path"; native setup is best-effort.

---

## 4. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Git | 2.30+ | Any recent version works. |
| Node.js | 18.x LTS (or as pinned in `.nvmrc` / `package.json` `engines`) | Use `nvm use` if you have `.nvmrc`. |
| Package manager | As pinned by the repo (`npm`/`yarn`/`pnpm` lockfile) | Do not mix package managers. |
| Docker | 20.10+ | Required for the Compose workflow. |
| Docker Compose | v2 (`docker compose`) | The v1 `docker-compose` binary is deprecated. |
| Foundry or Hardhat | As pinned in the contracts package | Used to build/deploy contracts. |

Verify your toolchain:

```bash
git --version
node --version
docker --version
docker compose version
```

Expected output (versions will vary):

```text
git version 2.40.1
v18.19.0
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0
```

> If any command is missing, install the tool before continuing. `scripts/setup.sh` performs these checks and exits non-zero if a prerequisite is absent.

---

## 5. Clone and bootstrap

```bash
git clone <repository-url>
cd <repository-name>
./scripts/setup.sh
```

`scripts/setup.sh` performs the following (see the script for the authoritative behavior):

1. Verifies prerequisites (Node, Docker, Compose).
2. Copies `.env.example` to `.env` if `.env` does not already exist.
3. Installs dependencies for each package.
4. Optionally builds contracts.

Expected output (abridged):

```text
[setup] Checking prerequisites...
[setup] Node.js v18.19.0 OK
[setup] Docker 24.0.7 OK
[setup] Docker Compose v2.23.0 OK
[setup] Creating .env from .env.example
[setup] Installing dependencies...
[setup] Done. Next: review .env, then run `docker compose up`.
```

If `.env` already exists, the script leaves it untouched. Review it before starting the stack.

---

## 6. Environment variables

All local configuration flows through `.env` at the repository root. Copy the template and adjust as needed:

```bash
cp .env.example .env
```

Key variables (see `.env.example` for the full, authoritative list):

| Variable | Purpose | Example |
| --- | --- | --- |
| `CHAIN_ID` | Local chain ID used by contracts and backend | `31337` |
| `RPC_URL` | JSON-RPC endpoint for the local chain | `http://localhost:8545` |
| `DEPLOYER_PRIVATE_KEY` | Key used to deploy contracts locally (never use a real key) | `0xac0974...` |
| `BACKEND_PORT` | Port the backend API listens on | `3001` |
| `DATABASE_URL` | Connection string for the backend database | `postgres://user:pass@db:5432/app` |
| `FRONTEND_PORT` | Port the frontend dev server listens on | `3000` |
| `NEXT_PUBLIC_API_URL` | API base URL consumed by the frontend | `http://localhost:3001` |

> **Security note:** The values in `.env.example` are for local development only. Never commit a populated `.env` or real private keys.

---

## 7. Docker Compose usage

The stack is defined in `docker-compose.yml` (with optional overrides such as `docker-compose.override.yml`). Compose reads `.env` automatically.

### 7.1 Start the full stack

```bash
docker compose up -d
```

Expected output (abridged):

```text
[+] Running 5/5
 ✔ Network app_default       Created
 ✔ Container app-db-1        Started
 ✔ Container app-chain-1     Started
 ✔ Container app-backend-1   Started
 ✔ Container app-frontend-1  Started
```

### 7.2 Check status

```bash
docker compose ps
```

Expected output (abridged):

```text
NAME              IMAGE            STATUS         PORTS
app-backend-1     app-backend      Up (healthy)   0.0.0.0:3001->3001/tcp
app-chain-1       app-chain        Up             0.0.0.0:8545->8545/tcp
app-db-1          postgres:15      Up (healthy)   5432/tcp
app-frontend-1    app-frontend     Up             0.0.0.0:3000->3000/tcp
```

### 7.3 Follow logs

```bash
docker compose logs -f backend
```

Expected output (abridged):

```text
backend-1  | API listening on http://0.0.0.0:3001
backend-1  | Connected to database
```

### 7.4 Stop the stack

```bash
docker compose down
```

Add `-v` to also remove volumes (this deletes local database and chain state):

```bash
docker compose down -v
```

### 7.5 Rebuild after dependency changes

```bash
docker compose build --no-cache
docker compose up -d
```

---

## 8. Contract build and deploy

Contracts live in the contracts package. Build them first:

```bash
cd contracts
# Foundry
forge build
# or Hardhat
npx hardhat compile
```

Expected output (Foundry, abridged):

```text
[⠆] Compiling...
[⠰] Compiling 12 files with 0.8.20
Compiler run successful!
```

Deploy to the local chain (ensure the chain container is running via `docker compose up -d chain`):

```bash
# Foundry
forge script script/Deploy.s.sol --rpc-url "$RPC_URL" --broadcast
# or Hardhat
npx hardhat run scripts/deploy.ts --network localhost
```

Expected output (abridged):

```text
Script ran successfully.
== Logs ==
  Deployed ContractA at 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Deployed ContractB at 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Record the deployed addresses in `.env` (or the backend's config) if your workflow requires it, then restart the backend:

```bash
docker compose restart backend
```

---

## 9. Backend startup

### 9.1 Via Docker Compose (recommended)

The backend starts as part of `docker compose up -d`. To run it alone:

```bash
docker compose up -d db chain backend
```

Verify it responds:

```bash
curl -s http://localhost:3001/health
```

Expected output:

```json
{"status":"ok"}
```

### 9.2 Natively (secondary path)

```bash
cd backend
npm install
npm run dev
```

Expected output (abridged):

```text
> backend@ dev
> ts-node-dev src/index.ts
API listening on http://localhost:3001
```

---

## 10. Frontend startup

### 10.1 Via Docker Compose (recommended)

The frontend starts as part of `docker compose up -d`. To run it alone:

```bash
docker compose up -d frontend
```

Open <http://localhost:3000> in a browser. You should see the application landing page.

### 10.2 Natively (secondary path)

```bash
cd frontend
npm install
npm run dev
```

Expected output (abridged):

```text
> frontend@ dev
> next dev
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 11. Test commands

Run tests per package. From the repository root:

```bash
# Contracts
cd contracts && forge test        # or: npx hardhat test

# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

Expected output (abridged):

```text
# Contracts
Ran 24 tests for test/ContractA.t.sol:ContractATest
[PASS] testDeploy() (gas: 123456)
Suite result: ok. 24 passed; 0 failed; 0 skipped

# Backend
PASS  src/__tests__/api.test.ts
Tests:       18 passed, 18 total

# Frontend
PASS  src/__tests__/app.test.tsx
Tests:       9 passed, 9 total
```

To run the full suite in one shot (if a root script exists):

```bash
npm test
```

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `docker compose up` fails with "port already allocated" | Another process uses 3000/3001/8545 | Stop the conflicting process or change `*_PORT` in `.env`. |
| Backend logs "ECONNREFUSED db" | Database not ready | Wait for the `db` healthcheck, or `docker compose restart backend`. |
| Frontend shows API errors | `NEXT_PUBLIC_API_URL` wrong | Set it to `http://localhost:3001` and rebuild the frontend container. |
| Contract deploy fails "insufficient funds" | Deployer key not funded on local chain | Use the pre-funded dev key from `.env.example`. |
| `scripts/setup.sh` exits non-zero | Missing prerequisite | Install the reported tool and re-run. |

---

## 13. Related documents

- [`README.md`](../README.md) — project overview and quick start.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution workflow and coding standards.
- [`docs/contributing/setup.md`](contributing/setup.md) — contributor-focused setup notes.
- [`scripts/setup.sh`](../scripts/setup.sh) — bootstrap script (authoritative for prerequisite checks).
- [`docker-compose.yml`](../docker-compose.yml) — local stack definition.

---

## 14. Maintenance

When you change any of the following, update this guide in the same pull request:

- `docker-compose*.yml`
- `scripts/setup.sh`
- `.env.example`
- Package scripts (`package.json` `scripts` entries)
- Contract deploy scripts

Re-run every command in this document and update the recorded expected output if it has changed.