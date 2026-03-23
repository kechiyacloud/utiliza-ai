import api from "./axios";

let dashboardCaches = {};

export const clearDashboardCache = (department) => {
    if (department) {
        delete dashboardCaches[department];
        return;
    }

    dashboardCaches = {};
};

export const fetchDashboardData = async (forceUpdate = false, department = 'Overall') => {
    try {
        const cacheKey = department || 'Overall';
        const cacheEntry = dashboardCaches[cacheKey];

        if (!forceUpdate && cacheEntry && (Date.now() - cacheEntry.time < 5 * 60 * 1000)) {
            return { data: cacheEntry.data, todos: cacheEntry.todos };
        }

        const params = department && department !== 'Overall' ? { department } : {};
        const megaRes = await api.get('/dashboard/all', { params });
        const mega = megaRes?.data || {};

        const info = mega?.infocards || {};
        const forecast = Array.isArray(mega?.allocation_3m) ? mega.allocation_3m : [];
        const highAlloc = Array.isArray(mega?.high_allocation) ? mega.high_allocation : [];
        const performers = Array.isArray(mega?.top_performers) ? mega.top_performers : [];
        const availability = Array.isArray(mega?.availability) ? mega.availability : [];
        const executive = mega?.executive || {};
        const skillsGap = Array.isArray(mega?.skills_gap) ? mega.skills_gap : [];
        const transitions = Array.isArray(mega?.transitions) ? mega.transitions : [];
        const certs = Array.isArray(mega?.certifications) ? mega.certifications : [];

        // Map Backend structure to Frontend Expected Structure
        const REAL_DASHBOARD_DATA = {
            executiveCards: {
                totalEmployees: { value: info?.total_employees ?? 0, change: "", label: "Total Employees" },
                activeClients: { value: info?.total_clients ?? 0, change: "", label: "Active Clients" },
                runningProjects: { value: info?.running_projects ?? 0, change: "", label: "Running Projects", alertCount: 0 },
                benchStrength: { value: info?.bench_employees ?? 0, change: "", label: "Bench Strength" }
            },
            resourceForecast: forecast.map((f) => ({
                month: f?.month || "Unknown",
                totalEmployees: info?.total_employees ?? 0,
                allocated: f?.allocations ?? 0
            })),
            highAllocationProjects: highAlloc.map((p, idx) => ({
                id: idx,
                name: p?.project_name || "Unknown",
                resources: p?.resource_count ?? 0,
                utilization: Math.min(100, Math.round(((p?.resource_count || 0) / Math.max(info?.total_employees || 1, 1)) * 100))
            })),
            topPerformers: performers.map((p) => ({
                id: p?.employee_id,
                name: p?.employee_name || "Unknown",
                role: p?.role || "Employee",
                allocation: p?.allocation ?? 0,
                avatar: p?.employee_name
                    ? p.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('')
                    : "U"
            })),
            resourceAvailability: availability.map((a, idx) => ({
                id: idx.toString(),
                name: a?.employee || "Unknown",
                project: a?.project || "Unknown",
                releaseDate: a?.release_date,
                availability: a?.allocation_percent ?? 0
            })),
            skillsGap: skillsGap.map((s, idx) => ({
                id: idx,
                skill: s?.skill || "Unknown",
                certified: s?.certified ?? 0,
                demand: s?.demand ?? 0,
                gap: s?.gap || "low"
            })),
            recentTransitions: transitions.map((t, idx) => ({
                id: idx,
                employee: t?.employee || "Unknown",
                fromProject: t?.from_project || 'Bench',
                toProject: t?.to_project || "Unknown",
                movement: `${t?.from_project || 'Bench'} -> ${t?.to_project || "Unknown"}`,
                date: t?.date,
                role: t?.role || "Resource"
            })),
            certificationExpiry: certs,
            executiveMetrics: executive,
            riskInsights: mega?.risk_insights || []
        };

        dashboardCaches[cacheKey] = {
            data: REAL_DASHBOARD_DATA,
            todos: mega.manual_todos || mega.todos || [],
            time: Date.now()
        };

        return { data: REAL_DASHBOARD_DATA, todos: mega.manual_todos || mega.todos || [] };

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return {
            data: {
                executiveCards: {
                    totalEmployees: { value: 0, change: "", label: "Total Employees" },
                    activeClients: { value: 0, change: "", label: "Active Clients" },
                    runningProjects: { value: 0, change: "", label: "Running Projects", alertCount: 0 },
                    benchStrength: { value: 0, change: "", label: "Bench Strength" }
                },
                resourceForecast: [],
                highAllocationProjects: [],
                topPerformers: [],
                resourceAvailability: [],
                skillsGap: [],
                recentTransitions: [],
                certificationExpiry: [],
                executiveMetrics: {
                    company_utilization: 0,
                    billable_headcount: 0,
                    bench_headcount: 0,
                    notice_period: 0,
                    internal_headcount: 0,
                    total_employees: 0,
                    bench_skills: [],
                    upcoming_bench: 0,
                    forecast: [],
                    projects_at_risk: [],
                    alerts: [],
                    bench_aging: [],
                    utilization_prediction: { tip: "", target: 85, gap: 0 },
                    utilization_trends: []
                },
                riskInsights: []
            },
            todos: []
        };
    }
};

export const fetchTodos = async () => {
    try {
        const response = await api.get('/dashboard/todos');
        return response.data;
    } catch (error) {
        console.error("Fetch Todos Error:", error);
        return [];
    }
};

export const addTodo = async (message, type = 'info') => {
    try {
        const response = await api.post('/dashboard/todos', { message, type });
        return response.data;
    } catch (error) {
        console.error("Add Todo Error:", error);
        throw error;
    }
};

export const toggleTodo = async (todoId) => {
    try {
        const response = await api.put(`/dashboard/todos/${todoId}/toggle`);
        return response.data;
    } catch (error) {
        console.error("Toggle Todo Error:", error);
        throw error;
    }
};

export const clearTodo = async (todoId) => {
    try {
        const response = await api.delete(`/dashboard/todos/${todoId}`);
        return response.data;
    } catch (error) {
        console.error("Clear Todo Error:", error);
        throw error;
    }
};

export const updateTodo = async (todoId, payload) => {
    try {
        const response = await api.put(`/dashboard/todos/${todoId}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update Todo Error:", error);
        throw error;
    }
};

export const exportRiskBoard = async () => {
    try {
        const response = await api.get('/dashboard/export-risk-board', {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        console.error("Export Risk Board Error:", error);
        throw error;
    }
};
