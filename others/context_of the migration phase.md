# Context of the Migration Phase

This document provides a comprehensive summary of the five-phase PostgreSQL schema migration project for `cd-utiliza-ai`.

## Phase 1: Schema Audit & Diffing
- **Objective**: Identify structural differences between legacy EC2 schema and the target v3 normalized schema.
- **Key Findings**: 
    - Partners and Skills primary keys changed from `SERIAL` (Integer) to `VARCHAR` (e.g., `PRT-0001`, `SKL-001`).
    - Project data was partitioned into `projects`, `project_commercials`, and `project_scopes`.
    - Added lookup tables for `departments` and `designations`.
- **Outcome**: Generated a localized `SCHEMA_DIFF_REPORT.md` to guide the migration.

## Phase 2: Impact Analysis
- **Objective**: Map code-level dependencies on the changing schema.
- **Key Findings**:
    - Backend: Identified 10+ FastAPI routers using deprecated raw SQL queries (e.g., `w1`, `w2` columns).
    - Frontend: Identified 12+ components needing updates for the new string-based IDs.
- **Outcome**: Generated `CHANGE_IMPACT_REPORT.md` designating exactly which files require refactoring.

## Phase 3: Local Docker Setup
- **Objective**: Provision a reliable test environment in Docker (WSL).
- **Key Actions**:
    - Spun up `pg_migration_local` using PostgreSQL 16 image.
    - **Technical Solve**: Resolved a critical PostgreSQL immutability error in `new_schemas.sql` by refactoring `GENERATED ALWAYS AS` columns into a trigger-based calculation (handled in `fn_validate_iso_week`).
- **Outcome**: Target v3 schema successfully applied to the local container.

## Phase 4: Data Migration (ETL)
- **Objective**: Extract, Transform, and Load legacy data while maintaining integrity.
- **Key Actions**:
    - Extracted 81KB of production data from the EC2 instance.
    - Implemented a robust "Staging -> Final" ETL pipeline (`migration_etl.sql`).
    - **Data Cleaning**: Performed deduplication on legacy employee records (phone/email collisions) and handled NULL-safety for mandatory fields.
    - **PK Mapping**: Successfully converted integer references to the new `PRT-NNNN` and `SKL-NNN` string formats.
- **Outcome**: Populated all 18 target tables with valid production-grade data.

## Phase 5: Verification & Cleanup
- **Objective**: Validate the integrity of the migrated data and clean up.
- **Results**:
    - **Employee Count**: 26 (Deduplicated).
    - **Project Count**: 17.
    - **Allocation Count**: 25 records with 40 computed weekly slots.
    - **Logic Check**: Verified that the validation trigger correctly computed ISO week start/end dates for the year 2026.
- **Outcome**: Staging environment cleared. Migration finalized and signed off.

---
**Current Status**: Migration Complete. Local database `localhost:5433` is ready for application integration.
