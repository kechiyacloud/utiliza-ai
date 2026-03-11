import api from "./axios";

export const fetchDashboardData = async () => {
    try {
        const [
            infoCardsRes,
            forecastRes,
            highAllocationRes,
            performersRes,
            availabilityRes,
            executiveRes,
            skillsGapRes,
            transitionsRes,
            certsRes
        ] = await Promise.all([
            api.get('/dashboard/infocards').catch(e => { console.warn('infocards failed:', e.message); return { data: {} }; }),
            api.get('/dashboard/allocation-3m').catch(e => { console.warn('allocation-3m failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/high-allocation-projects').catch(e => { console.warn('high-allocation-projects failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/top-performers').catch(e => { console.warn('top-performers failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/upcoming-availability').catch(e => { console.warn('upcoming-availability failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/executive-metrics').catch(e => { console.warn('executive-metrics failed:', e.message); return { data: null }; }),
            api.get('/dashboard/skills-gap').catch(e => { console.warn('skills-gap failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/recent-transitions').catch(e => { console.warn('recent-transitions failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/certification-expiry').catch(e => { console.warn('certification-expiry failed:', e.message); return { data: [] }; })
        ]);

        // Safely extract data, fallback to defaults if 500/error occurred
        const info = infoCardsRes?.data || {};
        const forecast = Array.isArray(forecastRes?.data) ? forecastRes.data : [];
        const highAlloc = Array.isArray(highAllocationRes?.data) ? highAllocationRes.data : [];
        const performers = Array.isArray(performersRes?.data) ? performersRes.data : [];
        const availability = Array.isArray(availabilityRes?.data) ? availabilityRes.data : [];
        const executive = executiveRes?.data || {};
        const skillsGap = Array.isArray(skillsGapRes?.data) ? skillsGapRes.data : [];
        const transitions = Array.isArray(transitionsRes?.data) ? transitionsRes.data : [];
        const certs = Array.isArray(certsRes?.data) ? certsRes.data : [];

        // Map Backend structure to Frontend Expected Structure
        const REAL_DASHBOARD_DATA = {
            executiveCards: {
                totalEmployees: { value: info.total_employees ?? 0, change: "", label: "Total Employees" },
                activeClients: { value: info.total_clients ?? 0, change: "", label: "Active Clients" },
                runningProjects: { value: info.running_projects ?? 0, change: "", label: "Running Projects", alertCount: 0 },
                benchStrength: { value: info.bench_employees ?? 0, change: "", label: "Bench Strength" }
            },
            // allocation-3m: month + allocations fields from backend
            resourceForecast: forecast.map((f) => ({
                month: f.month,           // format "2026-03"
                totalEmployees: info.total_employees ?? 0,
                allocated: f.allocations  // count of allocated employees
            })),
            // project_name + resource_count from backend
            highAllocationProjects: highAlloc.map((p, idx) => ({
                id: idx,
                name: p.project_name || "Unknown",
                resources: p.resource_count ?? 0,
                utilization: Math.min(100, Math.round((p.resource_count / Math.max(info.total_employees, 1)) * 100))
            })),
            // top-performers: employee_id, employee_name, role, allocation
            topPerformers: performers.map((p) => ({
                id: p.employee_id,
                name: p.employee_name || "Unknown",
                role: p.role || "Employee",
                allocation: p.allocation ?? 0,
                avatar: p.employee_name
                    ? p.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('')
                    : "U"
            })),
            // upcoming-availability: employee, project, release_date, allocation_percent
            resourceAvailability: availability.map((a, idx) => ({
                id: idx.toString(),
                name: a.employee || "Unknown",
                project: a.project || "Unknown",
                releaseDate: a.release_date,
                availability: a.allocation_percent ?? 0
            })),
            skillsGap: skillsGap.map((s, idx) => ({
                id: idx,
                skill: s.skill,
                certified: s.certified ?? 0,
                demand: s.demand ?? 0,
                gap: s.gap || "low"
            })),
            recentTransitions: transitions.map((t, idx) => ({
                id: idx,
                employee: t.employee,
                project: t.project,
                date: t.date,
                role: t.role || "Resource"
            })),
            certificationExpiry: certs.map((c, idx) => ({
                id: idx,
                employee: c.employee,
                certName: c.certName,
                expiryDate: c.expiryDate,
                status: c.status || "Upcoming"
            })),
            executiveMetrics: executive || {}
        };

        return { data: REAL_DASHBOARD_DATA };

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
                executiveMetrics: {}
            }
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
