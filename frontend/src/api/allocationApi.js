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
export const fetchAllocationMetrics = async (params = {}) => {
    try {
        const res = await api.get('/allocations/metrics', { params });
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
export const fetchAllocationProjects = async (params = {}) => {
    try {
        const res = await api.get('/allocations/projects', { params });
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
export const fetchOrganizationUtilization = async (params = {}) => {
    try {
        const res = await api.get('/allocations/organization', { params });
        return res.data; // { used: number, breakdown: [{ label, value, color }] }
    } catch (error) {
        console.error("Organization Utilization API Error:", error);
        return { used: 0, breakdown: [] };
    }
};

// ---------- Fetch full allocation page data ----------
export const fetchAllocationData = async (filters = {}) => {
    try {
        // Map frontend filter keys to backend parameter names if necessary
        const params = {
            department: filters.department === 'All Departments' ? null : filters.department,
            resource_type: filters.resourceType === 'All Resources' ? null : filters.resourceType,
            location: filters.location === 'All Locations' ? null : filters.location
        };

        const [metrics, projects, orgUtilization] = await Promise.all([
            fetchAllocationMetrics(params),
            fetchAllocationProjects(params),
            fetchOrganizationUtilization(params)
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
export const fetchDepartmentBreakdown = async (params = {}) => {
    try {
        const res = await api.get('/allocations/department-breakdown', { params });
        return res.data; // [{ department, allocated_billable, ... }]
    } catch (error) {
        console.error("Department Breakdown API Error:", error);
        return [];
    }
};
// ---------- Fetch Forecast Bench List ----------
export const fetchForecastBench = async (department = null, location = null) => {
    try {
        const params = {};
        if (department && department !== 'All Departments') params.department = department;
        if (location && location !== 'All Locations') params.location = location;
        
        const res = await api.get('/allocations/forecast-bench', { params });
        return res.data; // [{ employee_id, employee_name, role, project_name, end_date }]
    } catch (error) {
        console.error("Forecast Bench API Error:", error);
        return [];
    }
};

// ---------- Fetch Possible Projects for Employee ----------
export const fetchPossibleProjects = async (employeeId) => {
    try {
        const res = await api.get(`/allocations/possible-projects/${employeeId}`);
        return res.data; // [{ project_id, project_name, status, match_score, matching_skills }]
    } catch (error) {
        console.error("Possible Projects API Error:", error);
        return [];
    }
};

// ---------- Fetch Filter Options (Departments, etc.) ----------
export const fetchFilterOptions = async () => {
    try {
        const res = await api.get('/employees/filter-options');
        return res.data; // { departments: [], locations: [], ... }
    } catch (error) {
        console.error("Filter Options API Error:", error);
        return { departments: [] };
    }
};

// ---------- Import Allocations (dry-run or commit) ----------
// payload: { records, dry_run, import_mode, import_scope, selected_month, scope_value }
export const importAllocations = async (payload) => {
    const res = await api.post('/allocations/import', payload);
    return res.data;
};
