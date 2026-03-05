import api from "./axios";

export const fetchDashboardData = async () => {
    try {
        const [
            infoCardsRes,
            forecastRes,
            highAllocationRes,
            performersRes,
            availabilityRes,
            executiveRes
        ] = await Promise.all([
            api.get('/dashboard/infocards').catch(() => ({ data: {} })),
            api.get('/dashboard/allocation-3m').catch(() => ({ data: [] })),
            api.get('/dashboard/high-allocation-projects').catch(() => ({ data: [] })),
            api.get('/dashboard/top-performers').catch(() => ({ data: [] })),
            api.get('/dashboard/upcoming-availability').catch(() => ({ data: [] })),
            api.get('/dashboard/executive-metrics').catch(() => ({ data: null }))
        ]);

        // Safely extract data, fallback to defaults if 500/error occurred
        const info = infoCardsRes?.data || {};
        const forecast = Array.isArray(forecastRes?.data) ? forecastRes.data : [];
        const highAlloc = Array.isArray(highAllocationRes?.data) ? highAllocationRes.data : [];
        const performers = Array.isArray(performersRes?.data) ? performersRes.data : [];
        const availability = Array.isArray(availabilityRes?.data) ? availabilityRes.data : [];
        const executive = executiveRes?.data || {};

        // Map Backend structure to Frontend Expected Structure
        const REAL_DASHBOARD_DATA = {
            executiveCards: {
                totalEmployees: { value: info.total_employees || 0, change: "", label: "Total Employees" },
                activeClients: { value: info.total_clients || 0, change: "", label: "Active Clients" },
                runningProjects: { value: info.running_projects || 0, change: "", label: "Running Projects", alertCount: 0 },
                benchStrength: { value: info.bench_employees || 0, change: "", label: "Bench Strength" }
            },
            resourceForecast: forecast.map((f) => ({
                month: f.month, // ex: "2026-03"
                totalEmployees: info.total_employees || 0, // Not explicitly tracked historically in this endpoint, so using current
                allocated: f.allocations
            })),
            highAllocationProjects: highAlloc.map((p, idx) => ({
                id: idx,
                name: p.project_name,
                resources: p.resource_count,
                utilization: 100 // Hardcoded visual for now or derived if needed
            })),
            topPerformers: performers.map((p) => ({
                id: p.employee_id,
                name: p.employee_name,
                role: p.role || "Employee",
                allocation: p.allocation || 0,
                avatar: p.employee_name ? p.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('') : "U"
            })),
            resourceAvailability: availability.map((a, idx) => ({
                id: idx.toString(),
                name: a.employee,
                project: a.project,
                releaseDate: a.release_date,
                availability: a.allocation_percent
            })),
            executiveMetrics: executive
        };

        return { data: REAL_DASHBOARD_DATA };

    } catch (error) {
        console.error("Dashboard API Error:", error);
        // Fallback empty structure
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
                executiveMetrics: {}
            }
        };
    }
};
