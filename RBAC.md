# Role-Based Access Control (RBAC) — Utiliza AI

## Overview

Utiliza AI uses a custom RBAC system built on top of its existing JWT authentication. The implementation adds **four roles** with a strict hierarchy, enforced at three layers:

1. **Database** — roles and permissions stored in PostgreSQL
2. **Backend API** — FastAPI route guards using `Depends()`
3. **Frontend UI** — React context, hooks, and conditional rendering

No third-party RBAC libraries are used. The entire system is ~300 lines across five files.

---

## Role Hierarchy

```
restricted_viewer (0) < viewer (1) < editor (2) < master_admin (3)
```

| Role | Level | Description |
|---|---|---|
| `restricted_viewer` | 0 | Read-only. Employee PII and project financials are hidden. No Settings page. |
| `viewer` | 1 | Full read-only including financials. Settings visible, no write actions. |
| `editor` | 2 | Full CRUD on employees, projects, allocations, clients. Cannot edit financials or manage users. |
| `master_admin` | 3 | Unrestricted. User management, bulk ops, financial field edits. |

---

## Layer 1 — Database

**File:** `database/migrate_rbac.sql`

### Tables created

```sql
-- Roles catalogue
CREATE TABLE public.roles (
    role_id    SERIAL PRIMARY KEY,
    role_name  VARCHAR(50)  NOT NULL UNIQUE,
    role_label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions catalogue
CREATE TABLE public.permissions (
    permission_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    action        VARCHAR(50)  NOT NULL,   -- 'read', 'write', 'delete'
    UNIQUE(resource_name, action)
);

-- Many-to-many mapping
CREATE TABLE public.role_permissions (
    role_id       INTEGER NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### Users table change

```sql
ALTER TABLE public.users ADD COLUMN role_id INTEGER REFERENCES public.roles(role_id);
```

### Seeded permissions

| Resource | Actions |
|---|---|
| `employees` | read, write, delete |
| `employee_pii` | read *(phone, date_of_birth, address)* |
| `projects` | read, write, delete |
| `project_commercials` | read, write *(budget, billing_type, revenue_model, contract_type, commercial_notes)* |
| `allocations` | read, write, delete |
| `clients` | read, write |
| `dashboard` | read |
| `settings_admin` | read, write *(import, sync, export)* |
| `users` | read, write *(role assignment, deactivation)* |

### Role-permission wiring summary

| Permission | `restricted_viewer` | `viewer` | `editor` | `master_admin` |
|---|:---:|:---:|:---:|:---:|
| employees read | ✓ | ✓ | ✓ | ✓ |
| employees write/delete | | | ✓ | ✓ |
| employee_pii read | | ✓ | ✓ | ✓ |
| projects read | ✓ | ✓ | ✓ | ✓ |
| projects write/delete | | | ✓ | ✓ |
| project_commercials read | | ✓ | ✓ | ✓ |
| project_commercials write | | | | ✓ |
| allocations read | ✓ | ✓ | ✓ | ✓ |
| allocations write/delete | | | ✓ | ✓ |
| clients read | ✓ | ✓ | ✓ | ✓ |
| clients write | | | ✓ | ✓ |
| dashboard read | ✓ | ✓ | ✓ | ✓ |
| settings_admin read/write | | | | ✓ |
| users read/write | | | | ✓ |

### Safe rollout default

```sql
-- All existing users default to master_admin so no one loses access during rollout
UPDATE public.users
SET role_id = (SELECT role_id FROM public.roles WHERE role_name = 'master_admin')
WHERE role_id IS NULL;
```

---

## Layer 2 — Backend (FastAPI)

### 2a. Role embedded in JWT

**File:** `backend/app/auth_utils.py`

When a user logs in, their role is fetched from the DB and embedded in the access token:

```python
def create_access_token(user_id: int, email: str, role: str = "viewer") -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,          # ← role stored here
        "exp": expire,
        "type": "access"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

When a request arrives, `get_current_user()` decodes the token and returns the role:

```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    role: str = payload.get("role", "viewer")
    return {"user_id": ..., "email": ..., "role": role}
```

The role travels with every request — no extra DB query needed per call.

**Login query** (in `auth.py`):
```sql
SELECT u.id, u.password_hash, COALESCE(r.role_name, 'viewer')
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
WHERE u.email = %s
```

**Refresh query** (in `auth.py`) — re-fetches role from DB so role changes take effect on next token refresh:
```sql
SELECT COALESCE(r.role_name, 'viewer')
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
WHERE u.id = %s
```

---

### 2b. RBAC engine

**File:** `backend/app/rbac_utils.py`

#### Role hierarchy constant

```python
ROLE_HIERARCHY: dict[str, int] = {
    "restricted_viewer": 0,
    "viewer": 1,
    "editor": 2,
    "master_admin": 3,
}
```

#### Field restriction map

Defines which response fields are stripped per role per resource type:

```python
FIELD_RESTRICTIONS = {
    "restricted_viewer": {
        "employee":       {"phone", "phone_number", "date_of_birth", "address"},
        "project_detail": {"budget", "billing_type", "revenue_model",
                           "contract_type", "commercial_notes"},
    },
    "viewer": {
        "project_detail": {"budget", "billing_type", "revenue_model",
                           "contract_type", "commercial_notes"},
    },
    # editor and master_admin: no restrictions
}
```

#### Guard factories

```python
def require_role(*allowed_roles: str):
    """Exact match — use for admin-only endpoints."""
    async def dep(user: dict = Depends(get_current_user)):
        if get_role(user) not in allowed_roles:
            raise HTTPException(403, "Access denied.")
        return user
    return dep

def require_min_role(min_role: str):
    """Hierarchical check — allows min_role and any higher role."""
    min_level = ROLE_HIERARCHY[min_role]
    async def dep(user: dict = Depends(get_current_user)):
        if ROLE_HIERARCHY.get(get_role(user), -1) < min_level:
            raise HTTPException(403, "Access denied.")
        return user
    return dep
```

#### Field stripping helper

```python
def strip_fields(data: dict, role: str, resource: str) -> dict:
    restricted = FIELD_RESTRICTIONS.get(role, {}).get(resource, set())
    return {k: v for k, v in data.items() if k not in restricted}
```

---

### 2c. Applying guards to routers

Guards are applied at two levels:

**Router-level** (applies to all routes in the file):
```python
router = APIRouter(
    prefix="/employees",
    dependencies=[Depends(require_min_role("restricted_viewer"))]
)
```

**Per-route** (additional restriction for mutation routes):
```python
@router.post("", dependencies=[Depends(require_min_role("editor"))])
def create_employee(...):
    ...

@router.post("/sync-all", dependencies=[Depends(require_role("master_admin"))])
def sync_all(...):
    ...
```

#### Guard matrix by router

| Router | Router-level guard | GET extra | POST/PUT/PATCH guard | DELETE/Admin guard |
|---|---|---|---|---|
| `employees.py` | `restricted_viewer` | — | `editor` | `master_admin` (sync-all) |
| `projects.py` | `restricted_viewer` | — | `editor` | `editor` |
| `clients.py` | `restricted_viewer` | — | `editor` | `editor` |
| `partner_clients.py` | `restricted_viewer` | — | `editor` | `editor` |
| `allocations.py` | `restricted_viewer` | — | `editor` | — |
| `availability.py` | `restricted_viewer` | — | `editor` | — |
| `dashboard.py` | `restricted_viewer` | — | `editor` | — |
| `feedback.py` | `restricted_viewer` | — | — | — |
| `users.py` | — | `master_admin` | `master_admin` | `master_admin` |

---

### 2d. Field stripping in responses

For `GET /employees` and `GET /employees/{id}`, PII is stripped per row before returning:

```python
@router.get("/list")
def get_all_employees(_user: dict = Depends(_require_viewer), ...):
    role = get_role(_user)
    for row in rows:
        d = { ... }  # build response dict
        results.append(strip_fields(d, role, "employee"))  # ← strips phone/dob/address for restricted_viewer
    return results
```

For `GET /projects/{id}/details`, financials are stripped:

```python
@router.get("/{id}/details")
def get_project_details(_user: dict = Depends(require_min_role("restricted_viewer")), ...):
    project_details = { ... }
    return strip_fields(project_details, get_role(_user), "project_detail")
```

For `PUT /projects/{id}/details`, editors cannot overwrite financial fields — they are silently nulled before the DB write:

```python
if not is_admin(_user):
    details.budget = None
    details.billing_type = None
    details.contract_type = None
    details.revenue_model = None
    details.commercial_notes = None
```

---

### 2e. User management API

**File:** `backend/app/routers/users.py`

All four endpoints are `master_admin` only:

```
GET    /api/users              List all users with their role and status
GET    /api/users/roles        List all available roles
PUT    /api/users/{id}/role    Assign a new role to a user
DELETE /api/users/{id}         Deactivate a user (sets is_active = false)
```

---

## Layer 3 — Frontend (React)

### 3a. JWT decode and role context

**File:** `frontend/src/context/AuthContext.jsx`

Decodes the JWT stored in `localStorage` on load (no extra API call needed) and makes the `role` available throughout the component tree:

```jsx
export function AuthProvider({ children }) {
    const token = localStorage.getItem('token');
    const payload = token ? decodeJwt(token) : null;  // client-side base64 decode

    const value = useMemo(() => ({
        role: payload?.role ?? null,
        userEmail: payload?.email ?? localStorage.getItem('userEmail') ?? null,
    }), [payload?.role, payload?.email]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

`AuthProvider` wraps all data providers in `context/index.jsx`:
```jsx
export const AppDataProvider = ({ children }) => (
    <AuthProvider>
        <DataRefreshProvider>
            <EmployeeProvider>
                ...
            </EmployeeProvider>
        </DataRefreshProvider>
    </AuthProvider>
);
```

---

### 3b. Permission hook

**File:** `frontend/src/hooks/usePermissions.js`

The primary hook used across all components:

```js
export function usePermissions() {
    const { role } = useAuth();
    const effectiveRole = role ?? 'restricted_viewer';  // safe default

    function can(action, resource) {
        return ROLE_PERMISSIONS[effectiveRole]?.[resource]?.includes(action) ?? false;
    }

    function isAtLeast(minRole) {
        return (ROLE_HIERARCHY[effectiveRole] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999);
    }

    return { role: effectiveRole, can, isAtLeast };
}
```

Usage examples:
```jsx
const { can, isAtLeast } = usePermissions();

can('write', 'employees')          // true for editor and master_admin
can('read', 'employee_pii')        // false for restricted_viewer
isAtLeast('viewer')                // true for viewer, editor, master_admin
isAtLeast('master_admin')          // true only for master_admin
```

---

### 3c. CanAccess component

**File:** `frontend/src/components/CanAccess.jsx`

Declarative wrapper for conditional rendering:

```jsx
export function CanAccess({ action, resource, minRole, fallback = null, children }) {
    const { can, isAtLeast } = usePermissions();
    const hasAccess = minRole ? isAtLeast(minRole) : can(action, resource);
    return hasAccess ? children : fallback;
}
```

Usage examples:
```jsx
// Hide add button from viewers
<CanAccess action="write" resource="employees">
    <button>Add Employee</button>
</CanAccess>

// Show a locked message as fallback
<CanAccess minRole="editor" fallback={<p>Read-only</p>}>
    <EditForm />
</CanAccess>
```

---

### 3d. Route-level protection

**File:** `frontend/src/ProtectedRoute.jsx`

Extended with an optional `minRole` prop. Redirects to `/info/dashboard` (not login) when the role is too low:

```jsx
function ProtectedRoute({ minRole } = {}) {
    const token = localStorage.getItem('token')

    if (!isTokenValid(token)) {
        return <Navigate to="/" replace />  // not logged in → login page
    }

    if (minRole) {
        const payload = getTokenPayload(token)
        const role = payload?.role ?? 'restricted_viewer'
        if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
            return <Navigate to="/info/dashboard" replace />  // insufficient role → dashboard
        }
    }

    return <Outlet />
}
```

---

### 3e. UI restrictions wired per feature

#### Navbar — filter menu items by role

**File:** `frontend/src/dashboard/Navbar.jsx`

```jsx
const allMenuItems = [
    { label: 'Dashboard',  path: 'dashboard',     minRole: 'restricted_viewer' },
    { label: 'Projects',   path: 'projects',      minRole: 'restricted_viewer' },
    { label: 'Employees',  path: 'employees/list',minRole: 'restricted_viewer' },
    { label: 'Allocations',path: 'allocation',    minRole: 'restricted_viewer' },
    { label: 'Availability',path: 'availability', minRole: 'restricted_viewer' },
    { label: 'Clients',    path: 'client',        minRole: 'restricted_viewer' },
    { label: 'Settings',   path: 'settings',      minRole: 'viewer' },        // hidden from restricted_viewer
    { label: 'Users',      path: 'users',         minRole: 'master_admin' },  // hidden from all except admin
];

const menuItems = allMenuItems.filter(item => isAtLeast(item.minRole));
```

#### Settings page — tab visibility and action gating

**File:** `frontend/src/dashboard/Settings.jsx`

The TABS array is computed at render time — the Access Control tab only appears for `master_admin`:

```jsx
const TABS = useMemo(() => [
    { id: 'profile',        label: 'Profile',         icon: User },
    { id: 'reports',        label: 'Report',          icon: BarChart2 },
    { id: 'data',           label: 'Data',            icon: Database },
    { id: 'feedback',       label: 'Feedback',        icon: MessageSquare },
    { id: 'mcp',            label: 'MCP',             icon: SettingsIcon },
    ...(isAdmin ? [{ id: 'access-control', label: 'Access Control', icon: ShieldCheck }] : []),
    { id: 'appearance',     label: 'Appearance',      icon: Laptop },
], [isAdmin]);
```

Inside the Data tab, Import Employees and Sync All Data buttons are gated by `isAdmin`:
```jsx
{isAdmin && <button onClick={onImport}>Import Employees</button>}
{isAdmin && <button onClick={onSync}>Sync All Data</button>}
// Export is available to all (viewer+)
```

#### Access Control tab — user management

The Access Control tab renders an inline `AccessControlSection` component (inside `Settings.jsx`) that:
- Fetches all users from `GET /api/users`
- Shows a table: email, role dropdown, status, last login, deactivate button
- Role dropdown calls `PUT /api/users/{id}/role` on change
- Deactivate button calls `DELETE /api/users/{id}` with a confirmation prompt

---

## Data Flow Summary

```
User logs in
    → backend JOINs roles table to get role_name
    → role embedded in JWT access token (8-hour lifetime)
    → token stored in localStorage

Every API request
    → Authorization: Bearer <token> header sent
    → backend decodes JWT, extracts role (O(1), no DB query)
    → FastAPI Depends() guard checks role against required level
    → response fields stripped before returning (if applicable)

Every page render
    → AuthContext decodes JWT from localStorage (client-side, no API call)
    → usePermissions() reads role from context
    → Navbar filters items, components show/hide buttons, tabs appear/disappear

Role change (by master_admin)
    → PUT /api/users/{id}/role → updates users.role_id in DB
    → Takes full effect on the target user's next token refresh (up to 8 hours)
    → or immediately on next login
```

---

## File Index

| File | Layer | Purpose |
|---|---|---|
| `database/migrate_rbac.sql` | DB | Creates roles, permissions, role_permissions; alters users table; seeds data |
| `backend/app/rbac_utils.py` | API | ROLE_HIERARCHY, FIELD_RESTRICTIONS, `require_role()`, `require_min_role()`, `strip_fields()` |
| `backend/app/auth_utils.py` | API | JWT creation/validation; role embedded in token payload |
| `backend/app/routers/auth.py` | API | Login and refresh both fetch + embed role from DB |
| `backend/app/routers/users.py` | API | `GET/PUT/DELETE /api/users` — master_admin only |
| `frontend/src/context/AuthContext.jsx` | UI | Decodes JWT client-side; exposes `role` via React context |
| `frontend/src/hooks/usePermissions.js` | UI | `can(action, resource)` and `isAtLeast(minRole)` helpers |
| `frontend/src/components/CanAccess.jsx` | UI | Declarative `<CanAccess>` conditional render wrapper |
| `frontend/src/ProtectedRoute.jsx` | UI | Route guard with optional `minRole` redirect |
| `frontend/src/dashboard/Navbar.jsx` | UI | Filters nav items by `minRole` |
| `frontend/src/dashboard/Settings.jsx` | UI | Access Control tab with user table; Data tab gates admin ops |

---

## Why This Approach

| Option | Decision |
|---|---|
| **Casbin + fastapi-authz** | Rejected — requires SQLAlchemy adapter; codebase uses raw psycopg2 |
| **OPA (Open Policy Agent)** | Rejected — adds a separate server process + ~10-20ms network latency per request; overkill for 4 static roles |
| **Custom FastAPI `Depends()`** | Chosen — zero new dependencies, idiomatic FastAPI, O(1) checks from JWT, ~150 lines total |
