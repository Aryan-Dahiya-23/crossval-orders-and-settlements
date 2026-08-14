# Reference Analysis

## Purpose

This document records what was learned from the supplied assignment and the reviewed reference applications. It prevents visual inspiration from becoming accidental scope expansion or copied architecture.

## Assignment signal

The Orders & Settlements assignment rewards more than CRUD. Its strongest engineering signals are:

- partial payments;
- accurate total, paid, and due values;
- derived Pending, Partially Paid, Paid, and Overdue states;
- strict overpayment prevention;
- thoughtfulness about simultaneous payment submissions;
- safe atomic writes;
- a clear dashboard and order-detail workflow.

The implementation should therefore optimize for visible product clarity backed by strong atomic persistence behavior.

## Product framing

The chosen framing is a small B2B receivables operations dashboard. It is not a consumer checkout, a full accounting ledger, or an invoicing suite.

This leads to a simple hierarchy:

1. dashboard summarizes receivables and helps find an order;
2. order detail explains the amount and settlement history;
3. record payment is the main operational action;
4. creation/editing supports the lifecycle but should not dominate the experience.

## Reference synthesis

### Hypermarket

Most useful for:

- credible application shell;
- restrained spacing and navigation;
- data-dense tables;
- clear status and action placement.

Apply by using a calm dashboard layout, strong column alignment, compact metadata, and predictable list/detail movement.

Do not copy any domain-specific content, source code, or unnecessary feature breadth.

### ResolveX

Most useful for:

- operational list patterns;
- row links and clear record identity;
- legible status treatments;
- direct navigation from an overview into a focused record.

Apply by making order identity and state obvious at a glance and keeping filters close to the table they control.

### Synergy

Most useful for:

- form structure;
- spacious input grouping;
- drawer/dialog discipline;
- contextual secondary actions.

Apply by giving the line-item form enough space and making the payment dialog focused, explicit, and easy to validate.

## Unified direction

| Area          | Chosen direction                                                              |
| ------------- | ----------------------------------------------------------------------------- |
| Shell         | Restrained B2B navigation with one clear active product area                  |
| Dashboard     | Four financial summaries, useful filters, dense orders table                  |
| Detail        | Strong identity/status header, financial summary, line items, payment history |
| Forms         | Full-page order form; focused payment dialog                                  |
| Actions       | Primary actions obvious; destructive actions contextual and confirmed         |
| Visual system | Align UI foundation with product-specific composition                         |
| Motion        | Minimal and functional                                                        |
| Charts        | Omitted unless they answer a real question better than summary values         |

## What not to inherit

- unrelated navigation sections merely to make the app look larger;
- decorative analytics with invented trends;
- frontend-only data modeling;
- state colors without text;
- hidden row interactions that compromise keyboard access;
- side panels too narrow for line-item editing;
- a visual style that conflicts with Align UI;
- copied brand assets or code.

## Architecture lessons from the references

The references primarily inform presentation. They do not override the domain architecture. The backend remains responsible for totals, derived status, ownership, concurrency, and audit-friendly payment history. React Query makes the UI responsive to server state but does not become a second financial source of truth.

## Review questions

During implementation reviews, ask:

- Can a reviewer understand total, paid, due, due date, and status in under a few seconds?
- Is the Record Payment journey obvious from order detail?
- Does the dashboard look useful without adding fake analytics?
- Are dense areas still readable and keyboard accessible?
- Does each screen visibly handle loading, empty, error, and conflict states?
- Does the product feel coherent rather than like several reference styles combined?

## Evidence boundary

This analysis captures high-level patterns from reviewed examples and the assignment brief. It does not grant permission to reuse proprietary code, assets, copy, or hidden implementation details. All resulting implementation must be original and licensed dependencies must be used according to their terms.
