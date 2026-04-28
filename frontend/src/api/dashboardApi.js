import api from "./axios";

let dashboardCaches = {};

export const clearDashboardCache = (department) => {
    if (department) {
        delete dashboardCaches[department];
        return;
    }

    dashboardCaches = {};
};

export const fetchDepartments = async () => {
    try {
        const response = await api.get('/dashboard/departments');
        return response.data;
    } catch (error) {
        console.error("Fetch Departments Error:", error);
        throw error;
    }
};

export const fetchDashboardData = async (forceUpdate = false, filters = {}) => {
    try {
        const department = Array.isArray(filters.departments) && filters.departments.length > 0 ? filters.departments.join(',') : 'Overall';
        const cacheKey = JSON.stringify(filters) || 'Overall';
        const cacheEntry = dashboardCaches[cacheKey];

        // Reduced cache to 1 minute for better syncing
        if (!forceUpdate && cacheEntry && (Date.now() - cacheEntry.time < 1 * 60 * 1000)) {
            return { data: cacheEntry.data, todos: cacheEntry.todos };
        }

        const params = {
            department: department !== 'Overall' ? department : undefined,
            designations: Array.isArray(filters.designations) && filters.designations.length > 0 ? filters.designations.join(',') : undefined,
            locations: Array.isArray(filters.locations) && filters.locations.length > 0 ? filters.locations.join(',') : undefined,
            employment_types: Array.isArray(filters.types) && filters.types.length > 0 ? filters.types.join(',') : undefined,
            skills: Array.isArray(filters.skills) && filters.skills.length > 0 ? filters.skills.join(',') : undefined,
            status: Array.isArray(filters.statusTags) && filters.statusTags.length > 0 ? filters.statusTags.join(',') : undefined
        };
        const megaRes = await api.get('/dashboard/all', { params });
        const mega = megaRes?.data || {};

        const info = mega?.infocards || {};
        const forecast = Array.isArray(mega?.resourceForecast) ? mega.resourceForecast : [];
        const highAlloc = Array.isArray(mega?.highAllocationProjects) ? mega.highAllocationProjects : [];
        const performers = Array.isArray(mega?.topPerformers) ? mega.topPerformers : [];
        const availability = Array.isArray(mega?.resourceAvailability) ? mega.resourceAvailability : [];
        const executive = mega?.executiveMetrics || {};
        const skillsGap = Array.isArray(mega?.skillsGap) ? mega.skillsGap : [];
        const transitions = Array.isArray(mega?.recentTransitions) ? mega.recentTransitions : [];
        const certs = Array.isArray(mega?.certificationExpiry) ? mega.certificationExpiry : [];

        // Map Backend structure to Frontend Expected Structure
        const REAL_DASHBOARD_DATA = {
            executiveCards: {
                totalEmployees: { value: info?.totalEmployees?.value ?? 0, change: info?.totalEmployees?.change ?? "", label: "Total Employees" },
                activeClients: { value: info?.activeClients?.value ?? 0, change: info?.activeClients?.change ?? "", label: "Active Clients" },
                runningProjects: { value: info?.runningProjects?.value ?? 0, change: info?.runningProjects?.change ?? "", label: "Total Projects", alertCount: 0 },
                benchStrength: { value: info?.benchEmployees?.value ?? 0, change: info?.benchEmployees?.change ?? "", label: "Bench Strength" },
                newJoiners: { value: info?.newJoiners?.value ?? 0, change: info?.newJoiners?.change ?? "", label: "New Joiners" }
            },
            resourceForecast: forecast.map((f) => ({
                month: f?.month || "Unknown",
                totalEmployees: info?.totalEmployees?.value ?? 0,
                allocated: f?.allocations ?? 0
            })),
            highAllocationProjects: highAlloc.map((p, idx) => ({
                id: idx,
                name: p?.project_name || "Unknown",
                resource_count: p?.resource_count ?? 0,
            })),
            topPerformers: performers.map((p) => ({
                id: p?.employee_id,
                name: p?.name || "Unknown",
                role: p?.role || "Employee",
                allocation: p?.allocation ?? 0,
                avatar: p?.name
                    ? p.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                    : "U"
            })),
            resourceAvailability: availability.map((a) => ({
                id: a?.id || "0",
                name: a?.name || "Unknown",
                project: a?.project || "Unknown",
                releaseDate: a?.releaseDate,
                allocation: a?.allocation ?? 0
            })),
            skillsGap: skillsGap.map((s, idx) => ({
                id: idx,
                skill: s?.skill || "Unknown",
                availability: s?.availability ?? 0,
                allocated: s?.allocated ?? 0,
                gap: s?.gap || "low"
            })),
            recentTransitions: transitions.map((t) => ({
                id: t?.id || "0",
                employee: t?.employee || "Unknown",
                fromProject: t?.from_project || 'Bench',
                toProject: t?.to_project || "Unknown",
                movement: `${t?.from_project || 'Bench'} -> ${t?.to_project || "Unknown"}`,
                date: t?.date,
                role: t?.role || "Resource",
                type: t?.type
            })),
            certificationExpiry: certs.map((c) => ({
                ...c,
                id: c?.id || "0"
            })),
            executiveMetrics: executive,
            actionableTodos: mega?.actionable_todos || []
        };

        dashboardCaches[cacheKey] = {
            data: REAL_DASHBOARD_DATA,
            todos: mega.manual_todos || mega.todos || [],
            time: Date.now()
        };

        return { data: REAL_DASHBOARD_DATA, todos: mega.manual_todos || mega.todos || [] };

    } catch (error) {
        console.error("Dashboard API Error:", error);
        throw error;
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
