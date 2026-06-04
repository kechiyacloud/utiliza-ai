import sys
import os
sys.path.append(r'c:\Users\IjaazAhamed\Desktop\manman\cd-utiliza-ai\backend')
from app.routers.allocations import organization_utilization

res = organization_utilization(department=None, resource_type=None, location=None)
print("Organization Utilization:")
print(res)
