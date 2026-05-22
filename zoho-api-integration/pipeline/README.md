# Zoho People → PostgreSQL Data Pipeline

This directory contains the Python-based ETL (Extract, Transform, Load) pipeline that synchronizes employee data from Zoho People to a PostgreSQL database.

## Architecture Overview

The pipeline is designed to be idempotent, efficient, and safe. It ensures that data sourced from Zoho People is correctly mapped to the application's schema while preserving fields that are manually managed within the application UI.

```text
[Zoho People API] 
      │ (OAuth2 REST)
      ▼
[ Extraction ] ──► (zoho_api.py)
      │
      ▼
[ Transformation ] ──► (sync.py: Clean, Parse, Map)
      │
      ▼
[ Loading (Upsert) ] ──► (sync.py: Two-pass SQL execution)
      │
      ▼
[ PostgreSQL DB ] (employee_master & employee_master_pro)
```

## Core Components

### 1. `zoho_api.py` (The Extractor)
- **Authentication**: Uses OAuth2 refresh tokens to generate short-lived access tokens.
- **API Form**: Targets the `employee` form on `people.zoho.in`.
- **Logic**: Fetches records in batches and flattens the nested Zoho response into a list of employee dictionaries.

### 2. `db.py` (The Connector)
- **Connection Management**: Uses `psycopg2` to establish a reliable connection to the PostgreSQL database.
- **Configuration**: Loads credentials from the project's `.env` file (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`).

### 3. `sync.py` (The Orchestrator)
This is the heart of the pipeline, performing the Transform and Load operations.

#### Transformation Logic:
- **Field Mapping**: Maps Zoho fields (e.g., `EmployeeID`, `FirstName`, `LastName`) to the canonical database columns.
- **Name Concatenation**: Merges `FirstName` and `LastName` into a single `employee_name` string.
- **Data Cleaning**: Strips whitespace, normalizes empty strings/placeholders (like "N/A" or "-") to `NULL`.
- **Manager Resolution**: Parses the `Reporting_To` string to extract the specific `employee_id` required for the `reporting_manager_id` foreign key.
- **Phone Normalization**: Strips non-numeric characters to store phone numbers as `BIGINT`.

#### Data Delivery Strategy (Loading):
To maintain data integrity and respect foreign key constraints, the pipeline uses a **Two-Pass Loading** strategy:

- **Pass 1: Master Records**: Upserts data into the `employee_master` table.
- **Pass 2: Pro/Relationship Records**: Upserts data into `employee_master_pro`. This pass happens only after the master records exist, ensuring that `reporting_manager_id` can safely reference an existing record in `employee_master`.

**The Upsert Pattern:**
The pipeline uses the `INSERT ... ON CONFLICT (employee_id) DO UPDATE SET ...` pattern.
- **Idempotency**: Running the script multiple times results in the same final state.
- **Selective Updates**: Only columns provided by Zoho are updated. Columns that are strictly managed in the application UI (e.g., `pip_start_date`, `upcoming_leaves`, `employee_allocations`) are **not** part of the SQL update, ensuring no user data is overwritten by the sync.

## Database Schema
The pipeline targets two primary tables:

| Table | Purpose | Primary Identifier |
| :--- | :--- | :--- |
| `employee_master` | Core employee profile (Name, Email, Dept, Role, Joining Date). | `employee_id` |
| `employee_master_pro` | Operational data (Reporting Manager, Employee Status). | `employee_id` |

## How to Run
Ensure you have your `.env` configured with Zoho and Database credentials, then run:
```bash
python pipeline/sync.py
```
