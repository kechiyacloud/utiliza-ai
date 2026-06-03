import os
import requests
from dotenv import load_dotenv

load_dotenv()

ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN")
ZOHO_DOMAIN = "people.zoho.in"
ZOHO_ACCOUNTS_DOMAIN = "accounts.zoho.in"

def get_access_token():
    missing = [n for n, v in (
        ("ZOHO_CLIENT_ID", ZOHO_CLIENT_ID),
        ("ZOHO_CLIENT_SECRET", ZOHO_CLIENT_SECRET),
        ("ZOHO_REFRESH_TOKEN", ZOHO_REFRESH_TOKEN),
    ) if not v or v.startswith("<")]
    if missing:
        raise Exception(f"Missing/placeholder Zoho credentials: {', '.join(missing)}")

    url = f"https://{ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token"
    params = {
        "refresh_token": ZOHO_REFRESH_TOKEN,
        "client_id": ZOHO_CLIENT_ID,
        "client_secret": ZOHO_CLIENT_SECRET,
        "grant_type": "refresh_token"
    }
    response = requests.post(url, params=params)
    response.raise_for_status()
    data = response.json()
    if "access_token" not in data:
        raise Exception(f"Failed to get access token: {data}")
    return data["access_token"]

def fetch_employees(limit=200):
    access_token = get_access_token()
    url = f"https://{ZOHO_DOMAIN}/people/api/forms/employee/getRecords"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }
    
    all_employees = []
    s_index = 1
    
    while True:
        params = {
            "sIndex": s_index,
            "limit": limit
        }
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        result_list = data.get("response", {}).get("result", [])
        if not result_list:
            break

        page_employees = []
        for item in result_list:
            if not isinstance(item, dict):
                continue
            for record_id, record_data in item.items():
                if isinstance(record_data, list):
                    for emp in record_data:
                        if isinstance(emp, dict):
                            page_employees.append(emp)
                elif isinstance(record_data, dict):
                    page_employees.append(record_data)
                    
        if not page_employees:
            break
            
        all_employees.extend(page_employees)
        if len(page_employees) < limit:
            break
        s_index += limit
        
    return all_employees

if __name__ == "__main__":
    emps = fetch_employees()
    print(f"Fetched {len(emps)} employees.")
    if emps:
        print("Sample EmployeeID:", emps[0].get("EmployeeID"))
