import requests
import time
import sys

BASE_URL = "http://localhost:8005"

def wait_for_api():
    print("Waiting for API to be ready...")
    for _ in range(30):
        try:
            # We will just test the docs endpoint or list endpoint
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                print("API is up!")
                return True
        except requests.ConnectionError:
            pass
        time.sleep(1)
    print("API did not start in time.")
    return False

def test_api():
    if not wait_for_api():
        sys.exit(1)

    # 1. Test creating a client
    print("Creating a client...")
    res = requests.post(f"{BASE_URL}/clients", json={"name": "Test Client WSL"})
    if res.status_code not in [200, 201, 202, 400]:
        print(f"Failed to create client: {res.text}")
    print("Client Creation Result:", res.status_code)

    # 2. Test fetching clients
    print("Fetching clients...")
    res = requests.get(f"{BASE_URL}/clients")
    try:
        print("Clients:", res.json())
    except Exception:
        print("Clients GET Error:", res.text)

    # 3. Test creating a partner
    print("Creating a partner...")
    res = requests.post(f"{BASE_URL}/partners", json={"name": "Test Partner WSL"})
    print("Partner Creation Result:", res.status_code)

    # 4. Test fetching partners
    print("Fetching partners...")
    res = requests.get(f"{BASE_URL}/partners")
    print("Partners:", res.json())

    # 5. Test creating a project
    print("Creating a project with allocations...")
    project_payload = {
        "project_name": "Test WSL Project",
        "client_id": "CLI-1234", # Mock ID
        "partner_id": "PRT-1234", # Mock ID
        "project_type": "Fixed",
        "start_date": "2026-04-01",
        "end_date": "2026-10-01",
        "budget": 50000,
        "team_members": [
            {
                "employee_id": 1,
                "role": "Developer",
                "allocation": 100,
                "start_date": "2026-04-01",
                "end_date": "2026-10-01",
                "w1": 40, "w2": 40, "w3": 40, "w4": 40
            }
        ],
        "objective": "Test DB from WSL",
        "deliverables": "Working schema",
        "milestones": "V2 done",
        "timeline_notes": "None"
    }
    
    # We first try this, though we might need valid client_ids. Let's extract client_id from step 2 if possible!
    try:
        clients = requests.get(f"{BASE_URL}/clients").json()
        if clients and isinstance(clients, list):
            project_payload["client_id"] = clients[0].get("id", "CLI-1234")
    except Exception as e: print(e)

    try:
        partners = requests.get(f"{BASE_URL}/partners").json()
        if partners and isinstance(partners, list):
            project_payload["partner_id"] = partners[0].get("id", "PRT-1234")
    except Exception as e: print(e)

    res = requests.post(f"{BASE_URL}/projects/create", json=project_payload)
    print("Project Creation Result:", res.status_code, res.text)
    
if __name__ == "__main__":
    test_api()
