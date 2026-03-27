# Google Sheets $\leftrightarrow$ PostgreSQL Bidirectional Data Pipeline

This repository contains a suite of Google Apps Script (GAS) files designed to create a robust, bidirectional data mirroring pipeline between Google Sheets and a PostgreSQL database. It handles database schema extraction, DDL (Schema) modifications, and DML (Data) synchronization with strict transaction safety and audit logging.

## System Overview

The pipeline is split into five core operational phases. Each script is built to be run directly from the Google Apps Script editor or attached to Google Sheets UI triggers (like custom menus or buttons).

### Core Architecture Principles
1. **Bulk Operations Only**: All scripts avoid row-by-row `sheet.appendRow()` or `stmt.executeUpdate()` loops to prevent exceeding Google Apps Script's 6-minute execution quota. Native JDBC `executeBatch()` and Google Sheets `setValues()` are used exclusively.
2. **Two-Key DDL Validation**: Schema changes cannot be accidentally executed by just typing in the sheet; they require explicit authorization in a master `Schema_Log`.
3. **Atomic Transactions**: Data scripts use `conn.setAutoCommit(false)`. If any part of a batch insert fails, the whole transaction rolls back, preventing partial data corruption.
4. **Universal Audit Logging**: Every action (success or failure) is immutably written to a `System_Logs` sheet.

---

## The Scripts & Phases

### Phase 0: Initial Seeding (`pipeline_phase0.gs`)
**Purpose**: Pushes all existing data from Google Sheets into empty PostgreSQL tables and generates the initial schema map.
- **Features**:
  - Automatically iterates through all Google Sheets tabs (excluding system logs).
  - Dynamically builds `INSERT INTO` statements based on sheet headers.
  - Sanitizes empty strings `""` or `"-"` natively into SQL `NULL` values.
  - Queries `information_schema` to detect Primary Keys automatically and builds the `Schema_Log` sheet.
- **Limitations**:
  - Designed for *initialization on empty DB tables*. It does not handle `ON CONFLICT` updates (that is Phase 3).
- **Use Case**: You just created your DB tables on AWS EC2, and you need to push thousands of rows of legacy Google Sheets data into the database for the very first time.

### Standalone Utility: Schema Extractor (`schema_extractor.gs`)
**Purpose**: Generates the exact `Schema_Log` tab based on the live Postgres database without pushing any rows of data. 
- **Features**: Instantly maps table names, columns, data types, and primary key relationships.
- **Use Case**: You need to refresh the `Schema_Log` bindings after manually making changes on the backend DB server, but you are not ready to run a full Phase 0 or Phase 1 sync.

### Phase 1: Database Extraction (`pipeline_phase1.gs`)
**Purpose**: A clean UI mirror pull. Drops the existing Google Sheets data and completely refreshes it with the current authoritative state of the PostgreSQL database.
- **Features**:
  - Refreshes the `Schema_Log` to ensure the Sheets UI always knows the exact DB primary keys.
  - Dynamically discovers every user-created table in Postgres and creates a corresponding sheet tab.
  - Uses `setValues()` to dump hundreds of thousands of cells instantly.
- **Limitations**:
  - Overwrites Google Sheets. Any un-synced data currently sitting in the Sheet will be wiped by the incoming DB truth.
- **Use Case**: Used to reset the Sheets UI or perform a periodic hard-sync when you know the Database has the most up-to-date information.

### Phase 2: Safe Schema Modification (`pipeline_phase2.gs`)
**Purpose**: Execute DDL (`ALTER TABLE ... ADD/DROP COLUMN`) commands directly from Google Sheets without needing a SQL IDE safely.
- **Features**:
  - **Two-Key Validation**: Compares the headers in the data sheets to the Live DB. If it sees a missing or added column, it checks `Schema_Log` for an explicit `ADD` or `DROP` authorization. If none exists, it blocks the entire operation.
  - **Transactional Safety**: Uses `conn.setAutoCommit(false)` to ensure Postgres schema modifications are fully committed before touching the Google Sheet state, preventing desynchronization.
- **Limitations**:
  - Currently supports `ADD COLUMN` and `DROP COLUMN`. Does not actively support `ALTER COLUMN TYPE` (e.g., changing VARCHAR to INT).
- **Use Case**: Adding a new column (like "Phone Number") to your frontend sheet, marking it as "ADD" in the `Schema_Log`, and injecting the new structure immediately to the live Postgres database.

### Phase 3: Outbound Data Sync (`pipeline_phase3.gs`)
**Purpose**: Pushes updated data from Google Sheets out to the PostgreSQL database handling both new inserts and existing updates.
- **Features**:
  - Uses exact Primary Keys defined in `Schema_Log` to build dynamic `INSERT... ON CONFLICT (pk) DO UPDATE SET...` queries.
  - Handles composite Primary Keys perfectly. Handles pure join tables with `ON CONFLICT DO NOTHING`.
  - Groups queries into chunks of 500 rows using `stmt.addBatch()` to prevent memory overflow errors.
- **Limitations**:
  - Only syncs *additions* and *updates*. If you delete a row in Google Sheets, it will *not* delete that row in Postgres (to prevent accidental mass data loss). 
- **Use Case**: A team member spent 20 minutes updating customer records in Google Sheets. They run Phase 3, and all edits are safely UPSERTED to the Live Database.

### Phase 4: Inbound Data Sync / Strict Deduplication (`pipeline_phase4.gs`)
**Purpose**: Pulls data from Postgres to Sheets specifically to cleanly merge API updates without wiping un-synced Sheet data or creating duplicates.
- **Features**:
  - Generates an instant in-memory Dictionary (`Map`) hashing Primary Keys to reconcile data discrepancies in milliseconds.
  - Identifies "Orphans": If an API deleted row `ID: 25` from the Database, this script detects the orphaned key in Google Sheets and explicitly removes it.
- **Limitations**:
  - Requires tables to possess a strict Primary Key defined in `Schema_Log` to function; otherwise, it cannot logically deduplicate rows.
- **Use Case**: An external web application writes three new customer signups to PostgreSQL. You run Phase 4 to cleanly append those three rows to the bottom of the existing Google Sheet without touching the other 5,000 rows.

### Phase 5: Outbound Deletions Sync (`pipeline_phase5.gs`)
**Purpose**: Pushes row deletions from Google Sheets out to the PostgreSQL database safely.
- **Features**:
  - Requires the core `Schema_Log` Primary Keys to execute deletions exactly against the right rows.
  - Automatically maps out **Foreign Key constraints natively** so it always deletes child table dependencies *before* parent tables to prevent "violation of foreign key constraint" crashes.
  - Runs entirely inside a `conn.setAutoCommit(false)` transaction. If a single row fails to delete, it rolls the entire process back for total data safety.
- **Limitations**:
  - Will completely abort and refuse to run if the Google Sheet is entirely empty/cleared out to prevent disastrous accidental mass deletions.
- **Use Case**: You removed 5 obsolete customer accounts from the Google Sheet and want those rows physically deleted out of the Live Postgres database.

## Usage Guide

1. **Setup global credentials**: Make sure the `DB_CONFIG` block at the top of each script accurately points to your AWS EC2 IP, Postgres Port (default 5432), database name, user, and password.
2. **Whitelist Google IPs**: Ensure your AWS Security Group allows inbound TCP traffic on port 5432. Google Apps Script's JDBC service requires access from Google's IP ranges.
3. **Execution**: Open your Google Sheet, click `Extensions > Apps Script`, and select the function you wish to run (e.g., `seedDataAndGenerateSchema` or `syncSheetsToDatabase`). Click **Run**.
4. **Monitoring**: After running any sync, switch to your Google Sheet and view the `System_Logs` tab to see an immutable printout of exactly what succeeded or failed.
