# E2E Test Infra: CrossVal Orders & Settlements

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Derived from `ORIGINAL_REQUEST.md`, `AGENTS.md`, and `docs/DOMAIN_RULES.md`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Interaction + Real-World Workloads.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|----------------------|:------:|:------:|:------:|:------:|
| 1 | Order Creation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Line-Item Dynamic Calculations | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Order Replacement / Edit | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Order Deletion & Unpaid Guard | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Payment Recording & Settlement | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Idempotency Replay & Safety | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Derived Status Progression | DOMAIN_RULES.md | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Automated test suites spanning integration and E2E journeys.
- **Pass/Fail Semantics**: Clean exit code 0, 100% tests passing, zero unhandled errors.
- **Verification Scenarios**:
  - Core assignment scenario ($1,000 → $400 → $600 → reject $1).
  - Multi-item dynamic order creation with instant subtotal updates and redirect.
  - Replacement edit on unpaid orders with authoritative backend recalculation.
  - Deletion of unpaid orders with immediate dashboard cache invalidation.
  - Lock enforcement on paid orders (HTTP 409 and disabled UI state).
  - Idempotent payment replay returning original payment record.
  - Overpayment rejection returning 422 with remaining balance.
  - Due date boundary conditions (`due today` is not overdue, `paid` takes precedence over `overdue`).

## Coverage Thresholds
- Tier 1: Feature Coverage (>=5 per feature)
- Tier 2: Boundary & Corner Cases (>=5 per feature)
- Tier 3: Cross-Feature Combinations (Pairwise interactions)
- Tier 4: Real-World Workload Scenarios (Assignment flow, multi-user isolation, full lifecycle)
