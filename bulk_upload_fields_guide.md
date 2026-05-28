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
These columns are required depending on your **`project_type`**.

| Field Name | CSV Header | Required? | Accepted Values / Format | Description & Behavior |
| :--- | :--- | :---: | :--- | :--- |
| **Client ID** | `client_id` | **Conditionally** | Existing Client ID (e.g., `CL-0001`) | **Mandatory** if `project_type` is `Client` (default). |
| **Partner ID** | `partner_id` | **Conditionally** | Existing Partner ID (e.g., `PT-0001`) | **Mandatory** if `project_type` is `Partner`. |

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
| **Department ID** | `department_id` | `NULL` | Must exist in `departments` |
| **Role in Project** | `role_in_project`| `Developer` | Any role string (e.g., `UI Designer`) |
| **Allocation %** | `allocation_percentage` | `100` | Integer `0` to `100` |
| **Allocation Start** | `allocation_start_date` | Project `start_date` or Today | `YYYY-MM-DD` |
| **Allocation End** | `allocation_end_date` | Project `end_date` or `NULL` | `YYYY-MM-DD` |
| **Location** | `location` | `Remote` | `Remote`, `Onsite` |
| **Project Tags** | `project_tags` | Matches `billable` field | `Billable`, `Non-Billable`, `Shadow` |
