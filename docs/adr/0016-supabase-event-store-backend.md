# Supabase Event Store Backend

- Status: accepted
- Deciders: eitah
- Date: 2026-02-24

Technical Story: Replace flat Supabase CRUD POC with event-sourced ObjectStore + RefStore backed by Postgres

## Context and Problem Statement

The existing Supabase integration was a flat CRUD proof-of-concept (`matrices` table with title/description columns) that didn't match the event-sourced, git-like repository architecture established in ADR-0006 and ADR-0007. To persist matrices to Postgres with full event history and branching, the Supabase backend needs to implement the same `ObjectStore` and `RefStore` interfaces used by the memory and localStorage backends.

## Decision Drivers

- Event history must be preserved in Postgres, not just latest state
- Branching and merging must work identically to the in-memory and localStorage backends
- New event types should not require database schema changes
- Multiple matrices must coexist in the same database

## Considered Options

- Keep flat CRUD table and sync projected state
- Event store with fully normalized event columns
- Event store with JSONB payloads for events, real columns for commits

## Decision Outcome

Chosen option: "JSONB payloads for events, real columns for commits", because it balances schema simplicity with queryability.

Three tables replace the single `matrices` table:

- **`events`** — stores each `PughEvent` as a single JSONB `payload` column. This avoids needing a schema change every time a new event type is added.
- **`commits`** — stores commit DAG nodes with real columns (`parent_ids`, `event_ids`, `author`, `timestamp`, `comment`). These fields are flat and stable, so real columns enable future queries like "commits by author".
- **`refs`** — stores branch/tag pointers with a composite primary key of `(matrix_id, name)`.

Each store factory takes a `matrixId` parameter and filters all queries by it, unlike the single-matrix memory/localStorage backends.

### Positive Consequences

- Full event history is persisted to Postgres with the same fidelity as in-memory
- Adding new `PughEvent` types requires zero database migrations
- The same `createMatrixRepository` composition works for all three backends
- Multiple matrices are naturally isolated by `matrix_id` filtering

### Negative Consequences

- JSONB payloads are harder to query at the field level than normalized columns
- No foreign key constraints between events/commits/refs (text IDs instead of FK references)
- Anonymous RLS policies are permissive; authentication will need to be added later
