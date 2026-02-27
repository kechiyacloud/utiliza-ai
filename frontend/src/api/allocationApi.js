import api from './axios';

// ---------- Static data for other sections (unchanged) ----------
const allocationStaticData = {
    orgUtilization: {
        used: 0,
        available: 100,
        breakdown: []
    },
    departments: [],
    employees: []
};

// ---------- Fetch Allocation Metrics from Backend ----------
export const fetchAllocationMetrics = async () => {
    try {
        const res = await api.get('/allocations/metrics');
        return res.data;
    } catch (error) {
        console.error("Allocation Metrics API Error:", error);
        return {
            totalResources: { value: 0, label: "Total Resources" },
            billable: { value: 0, label: "Billable Count" },
            nonBillable: { value: 0, label: "Non-Billable" },
            benchStrength: { value: 0, label: "Bench Strength" },
            avgUtilization: { value: "0%", label: "Avg Utilization" },
            overallocated: { value: 0, label: "Overallocated", isAlert: false }
        };
    }
};

// ---------- Fetch Project List with Billable/Non-Billable Counts ----------
export const fetchAllocationProjects = async () => {
    try {
        const res = await api.get('/allocations/projects');
        return res.data; // [{ project_id, project_name, billable_count, non_billable_count }]
    } catch (error) {
        console.error("Allocation Projects API Error:", error);
        return [];
    }
};

// ---------- Fetch Employees for a Specific Project ----------
export const fetchProjectEmployees = async (projectId) => {
    try {
        const res = await api.get(`/allocations/projects/${projectId}/employees`);
        return res.data; // [{ employee_id, employee_name, allocation_percentage, project_tags }]
    } catch (error) {
        console.error("Project Employees API Error:", error);
        return [];
    }
};

// ---------- Fetch Organization Utilization ----------
export const fetchOrganizationUtilization = async () => {
    try {
        const res = await api.get('/allocations/organization');
        return res.data; // { used: number, breakdown: [{ label, value, color }] }
    } catch (error) {
        console.error("Organization Utilization API Error:", error);
        return { used: 0, breakdown: [] };
    }
};

// ---------- Fetch full allocation page data ----------
export const fetchAllocationData = async (filters = {}) => {
    try {
        const [metrics, projects, orgUtilization] = await Promise.all([
            fetchAllocationMetrics(),
            fetchAllocationProjects(),
            fetchOrganizationUtilization()
        ]);

        return {
            data: {
                metrics,
                projects,
                orgUtilization,
                ...allocationStaticData
            }
        };
    } catch (error) {
        console.error("Failed to load allocation data", error);
        return {
            data: {
                metrics: {
                    totalResources: { value: 0, label: "Total Resources" },
                    billable: { value: 0, label: "Billable Count" },
                    nonBillable: { value: 0, label: "Non-Billable" },
                    benchStrength: { value: 0, label: "Bench Strength" },
                    avgUtilization: { value: "0%", label: "Avg Utilization" },
                    overallocated: { value: 0, label: "Overallocated", isAlert: false }
                },
                projects: [],
                ...allocationStaticData
            }
        };
    }
};
// ---------- Fetch Department Breakdown (Billable vs Non-Billable) ----------
export const fetchDepartmentBreakdown = async () => {
    try {
        const res = await api.get('/allocations/department-breakdown');
        return res.data; // [{ department, billable, nonBillable }]
    } catch (error) {
        console.error("Department Breakdown API Error:", error);
        return [];
    }
};
