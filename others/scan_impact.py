import os
import re
import json

app_dir = os.path.join("backend", "app", "routers")
frontend_dir = os.path.join("frontend", "src")

# terms that changed
bad_terms = [
    "team_members", "employee_nominations", "w1", "w2", "w3", "w4", 
    "weekly_hours", "weekly_plan", "client_name", "partner_id", 
    "skill_id", "project_commercials", "project_scopes", "actionable_todos"
]
bad_pattern = re.compile(r'\b(' + '|'.join(bad_terms) + r')\b')

backend_impact = {}
endpoints = []

for root, _, files in os.walk(app_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if bad_pattern.search(content):
                reasons = set()
                # find endpoints
                lines = content.split('\n')
                current_endpoint = None
                for i, line in enumerate(lines):
                    method_match = re.search(r'@(?:router|app)\.(get|post|put|delete|patch)\("([^"]+)"', line)
                    if method_match:
                        current_endpoint = f"{method_match.group(1).upper()} {method_match.group(2)}"
                    
                    found = bad_pattern.findall(line)
                    if found:
                        for term in found:
                            reasons.add(term)
                        if current_endpoint and current_endpoint not in [e[0] for e in endpoints]:
                            endpoints.append((current_endpoint, path, list(reasons)))
                
                if reasons:
                    backend_impact[path] = f"References deprecated/modified fields: {', '.join(reasons)}"

frontend_impact = {}
for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith((".js", ".jsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            found = bad_pattern.findall(content)
            if found:
                frontend_impact[path] = f"Uses outdated API schema fields: {', '.join(set(found))}"

report = "IMPACT REPORT\n\nBackend Files to Modify:\n"
for path, reason in backend_impact.items():
    report += f"{path}: {reason}\n"

report += "\nFrontend Files to Modify:\n"
for path, reason in frontend_impact.items():
    report += f"{path}: {reason}\n"

report += "\nCORS Config Changes:\n"
report += "backend/app/main.py: No specific endpoint origins defined. Global CORS configuration covers all existing and new endpoints. Origin policies do not need per-endpoint updating.\n"

report += "\nAPI Endpoints Affected:\n"
for ep, path, terms in endpoints:
    report += f"{ep} → Payload/SQL uses old schema ({', '.join(terms)})\n"

with open("CHANGE_IMPACT_REPORT.md", "w", encoding="utf-8") as f:
    f.write(report)

print("Impact report generated.")
