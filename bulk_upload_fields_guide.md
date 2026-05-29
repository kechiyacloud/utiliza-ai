# Bulk Upload CSV Fields Guide

This guide describes the purpose, formats, and requirements of all fields available in the `bulk_upload_template.csv` for bulk uploading projects and allocations to **cd-utiliza-ai**.

---

## 1. Mandatory Fields

These columns **must** exist in your CSV header, and every row must contain valid, non-empty values.

| Field Name | CSV Header | Required? | Accepted Values / Format | Description & Behavior |
| :--- | :--- | :---: | :--- | :--- |
| **Project Name** | `project_name` | **YES** | String (non-empty) | Name of the project. Reuses the project if it exists, otherwise creates a new one. |
| **Employee ID / Email** | `employee_id` | **YES** | `EMP-XXXX` or corporate email | Identifier for the resource being allocated. Must exist in `employee_master`. |

---

## 2. Conditionally Mandatory Fields

These columns are required depending on your **`project_type`**. For Client / Partner projects you may supply either the **ID** (if the record already exists) **OR** the **name** (a new record is auto-created if no match is found, case-insensitive).

| Field Name | CSV Header | Required? | Accepted Values / Format | Description & Behavior |
| :--- | :--- | :---: | :--- | :--- |
| **Client ID** | `client_id` | **Conditionally** | Existing Client ID (e.g., `CLT-0001`) | Used when `project_type` is `Client`. Provide this **or** `client_name`. |
| **Client Name** | `client_name` | **Conditionally** | String (e.g., `Acme Corp`) | Used when `project_type` is `Client` and `client_id` is blank. Looked up case-insensitively; auto-created (`CLT-xxxx`) if not found. |
| **Partner ID** | `partner_id` | **Conditionally** | Existing Partner ID (e.g., `PRT-0001`) | Used when `project_type` is `Partner`. Provide this **or** `partner_name`. |
| **Partner Name** | `partner_name` | **Conditionally** | String (e.g., `TechVendor Inc`) | Used when `project_type` is `Partner` and `partner_id` is blank. Looked up case-insensitively; auto-created (`PRT-xxxx`) if not found. |

> **Note:** If both ID and name are supplied for the same entity, the **ID takes precedence** and the name is ignored.

---

## 3. Optional Fields (with Defaults/Fallbacks)

If these fields are left blank or omitted, the utility automatically applies the following default values or fallbacks:

| Field Name | CSV Header | Default / Fallback | Accepted Values |
| :--- | :--- | :--- | :--- |
| **Project Type** | `project_type` | `Client` | `Client`, `Partner`, `Internal` |
| **Project Status** | `project_status` | `Active` | `Active`, `Proposed`, `Completed` |
| **Billability** | `billable` | `Billable` | `Billable`, `Non-Billable`, `Shadow` |
| **Project Start Date** | `start_date` | `NULL` (ongoing) | `YYYY-MM-DD` |
| **Project End Date** | `end_date` | `NULL` (ongoing) | `YYYY-MM-DD` |
| **Department ID** | `department_id` | `NULL` | Existing dept ID (e.g., `DEPT-001`). Provide this **or** `department_name`. |
| **Department Name** | `department_name` | `NULL` | String (e.g., `Product Design`). Used when `department_id` is blank. Looked up case-insensitively, multi-spaces collapsed; auto-created (`DEPT-xxx`) if not found. |
| **Role in Project** | `role_in_project` | `Developer` | Any role string (e.g., `UI Designer`) |
| **Allocation %** | `allocation_percentage` | `100` | Integer `0` to `100` |
| **Allocation Start** | `allocation_start_date` | Project `start_date` or Today | `YYYY-MM-DD` |
| **Allocation End** | `allocation_end_date` | Project `end_date` or `NULL` | `YYYY-MM-DD` |
| **Location** | `location` | `Remote` | `Remote`, `Onsite` |
| **Project Tags** | `project_tags` | Matches `billable` field | `Billable`, `Non-Billable`, `Shadow` |

---

## 4. Auto-Create Behavior (Name Fallbacks)

When you supply a **name** instead of an **ID** for `client`, `partner`, or `department`:

1. The utility runs a **case-insensitive** lookup (`LOWER(name) = LOWER(input)`).
2. For `department_name`, multi-spaces between words are collapsed to a single space (e.g., `"Product  Design"` → `"Product Design"`) before lookup/insert.
3. If a matching row exists → its ID is reused.
4. If no match → a new row is inserted; the DB auto-generates the ID via trigger (`CLT-xxxx`, `PRT-xxxx`, `DEPT-xxx`).
5. The bulk import response summary reports counts as `new_clients`, `new_partners`, `new_departments`.

This makes the upload **idempotent** — re-uploading the same CSV does not create duplicates.
