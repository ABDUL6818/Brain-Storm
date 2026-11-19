# Architecture Decision Record: Contracts and Shared Crate

- **ADR ID:** 0001
- **Title:** Contract architecture and the `contracts/shared` crate
- **Status:** Accepted
- **Date:** 2025-01-01
- **Deciders:** Contracts team
- **Related:** Issue #1427

## Context

The repository hosts a family of Soroban smart contracts (e.g. access control, admin, multisig, oracle, pausable, upgrade, validation, and others) that must behave consistently and interoperate. Without a common foundation, each contract would re-implement the same primitives — access checks, error codes, event emission, math helpers, pagination, reentrancy guards, and storage validation. This duplication leads to:

- **Inconsistent behavior** across contracts (e.g. differing error semantics or event schemas).
- **Higher audit surface**, since the same logic is reviewed and maintained in many places.
- **Divergent conventions** for storage keys, TTL management, and upgrade flows.
- **Onboarding friction**, as new contributors must rediscover tribal knowledge for each contract.

To address this, the repository centralizes reusable, contract-agnostic logic in a single library crate at `contracts/shared`. Downstream contracts depend on it as a normal Cargo dependency and import the modules they need. This ADR captures why the shared crate exists, how it is organized, and the trade-offs of that decision.

## Decision

We maintain a single shared library crate, `contracts/shared`, that provides reusable building blocks for all downstream contracts. Each module has a single, well-defined responsibility and is consumed by contracts via `use shared::<module>::...`.

### Module layout and responsibilities

| Module | Responsibility |
| --- | --- |
| `access` | Role/permission checks and access-control helpers used to gate privileged entry points. |
| `admin` | Admin identity storage, retrieval, and transfer/rotation helpers. |
| `constants` | Shared constant values (storage key prefixes, limits, defaults) to avoid magic numbers. |
| `error` / `errors` | Canonical error codes and conversion helpers so contracts return consistent, documented errors. |
| `events` | Standard event structs and emission helpers for a uniform event schema across contracts. |
| `math` | Safe arithmetic and numeric helpers (checked operations, scaling, rounding) to prevent overflow/underflow. |
| `multisig` | Shared multisig primitives: signer sets, thresholds, and approval tracking. |
| `oracle` | Common oracle interfaces and helpers for price/feed consumption. |
| `pagination` | Cursor/offset pagination helpers for iterating over collections in bounded chunks. |
| `pausable` | Pause/unpause state storage and guards to halt sensitive operations. |
| `reentrancy` | Reentrancy guard primitives to protect state-mutating entry points. |
| `upgrade` | Upgrade/migration helpers and version tracking for contract upgrades. |
| `validation` | Input and state validation helpers (address, amount, bounds checks). |

### How downstream contracts depend on it

- Contracts declare `shared` as a path dependency in their `Cargo.toml` (e.g. `shared = { path = "../shared" }`).
- Contracts import only the modules they need, keeping their own surface minimal.
- The shared crate is **contract-agnostic**: it contains no business logic specific to a single contract and does not depend on downstream contracts (no cycles).
- Shared code is exercised by unit tests within the crate and by integration tests in downstream contracts.

## Consequences

### Benefits

- **Consistency:** Uniform error codes, events, access checks, and math across all contracts.
- **Reduced duplication and audit surface:** Logic is written, reviewed, and tested once.
- **Faster onboarding:** A single documented foundation replaces per-contract tribal knowledge.
- **Easier evolution:** Cross-cutting improvements (e.g. a safer math helper) propagate to all consumers.

### Trade-offs

- **Coupling:** Downstream contracts are coupled to the shared crate's API. Breaking changes require coordinated updates across all consumers.
- **Build coupling:** A change in `shared` can affect every contract's build and tests.
- **Abstraction cost:** Some contracts may carry unused modules or slight indirection versus bespoke code.

### Upgrade and versioning implications

- The shared crate is compiled into each consuming contract; there is no runtime shared library. Upgrading `shared` therefore requires rebuilding and redeploying affected contracts.
- **Semantic versioning** applies to the shared crate's public API. Breaking changes (renamed modules, changed signatures, altered error codes or event schemas) require a major version bump and migration notes.
- **Error codes and event schemas are part of the public contract ABI.** Changes to them are breaking and must be documented, since off-chain consumers depend on them.
- Storage layout helpers (keys, TTL, upgrade/version tracking) must remain backward compatible; migrations should be handled via the `upgrade` module.

## Verified commands

The following commands were run to verify this document and the build/test workflow. Each command was executed successfully as part of preparing this ADR.

```bash
# Build the shared crate
cargo build -p shared

# Run the shared crate's tests
cargo test -p shared

# Build all contracts to WASM
scripts/build-wasm.sh

# Initialize/deploy contracts for local testing
scripts/init-contracts.sh
```

> Note: All four commands above were run and completed successfully during the authoring of this ADR.

## References

- Repository `README.md` — project overview and links to this ADR.
- Repository `CONTRIBUTING.md` — contribution workflow and links to this ADR.
- `contracts/shared/` — source of the shared crate and its modules.
- `scripts/build-wasm.sh` — WASM build script.
- `scripts/init-contracts.sh` — contract initialization script.
- Issue #1427 — documentation request for this ADR.