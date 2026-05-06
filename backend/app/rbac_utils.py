from fastapi import Depends, HTTPException, status
from app.auth_utils import get_current_user

ROLE_HIERARCHY: dict[str, int] = {
    "restricted_viewer": 0,
    "viewer": 1,
    "editor": 2,
    "master_admin": 3,
}

# Fields stripped from response dicts per role per resource type.
# Keys under each role are resource identifiers used in strip_fields() calls.
FIELD_RESTRICTIONS: dict[str, dict[str, set]] = {
    "restricted_viewer": {
        "employee": {"phone", "phone_number", "date_of_birth", "address"},
        "project_detail": {
            "budget", "billing_type", "revenue_model",
            "contract_type", "commercial_notes",
        },
    },
    "viewer": {
        "project_detail": {
            "budget", "billing_type", "revenue_model",
            "contract_type", "commercial_notes",
        },
    },
    # editor and master_admin: no field restrictions
}


def get_role(user: dict) -> str:
    return user.get("role", "viewer")


def strip_fields(data: dict, role: str, resource: str) -> dict:
    """Remove fields the given role cannot see from a response dict."""
    restricted = FIELD_RESTRICTIONS.get(role, {}).get(resource, set())
    if not restricted:
        return data
    return {k: v for k, v in data.items() if k not in restricted}


def require_role(*allowed_roles: str):
    """
    FastAPI Depends factory for exact role matching.
    Use for endpoints that require a specific role (e.g. master_admin only).

    Usage:
        _user: dict = Depends(require_role("master_admin"))
    """
    async def dep(user: dict = Depends(get_current_user)):
        if get_role(user) not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}.",
            )
        return user
    return dep


def require_min_role(min_role: str):
    """
    FastAPI Depends factory for hierarchical role access.
    Allows the given role AND any higher roles.

    Usage:
        _user: dict = Depends(require_min_role("editor"))
        # allows editor and master_admin
    """
    min_level = ROLE_HIERARCHY.get(min_role, 0)

    async def dep(user: dict = Depends(get_current_user)):
        level = ROLE_HIERARCHY.get(get_role(user), -1)
        if level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Minimum required role: {min_role}.",
            )
        return user
    return dep


def can_write(user: dict) -> bool:
    """Quick check: does this user have at least editor-level access?"""
    return ROLE_HIERARCHY.get(get_role(user), -1) >= ROLE_HIERARCHY["editor"]


def is_admin(user: dict) -> bool:
    """Quick check: is this user a master_admin?"""
    return get_role(user) == "master_admin"
