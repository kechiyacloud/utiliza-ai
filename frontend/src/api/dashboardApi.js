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
            api.get('/dashboard/infocards').catch(e => { console.warn('infocards failed:', e.message); return { data: {} }; }),
            api.get('/dashboard/allocation-3m').catch(e => { console.warn('allocation-3m failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/high-allocation-projects').catch(e => { console.warn('high-allocation-projects failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/top-performers').catch(e => { console.warn('top-performers failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/upcoming-availability').catch(e => { console.warn('upcoming-availability failed:', e.message); return { data: [] }; }),
            api.get('/dashboard/executive-metrics').catch(e => { console.warn('executive-metrics failed:', e.message); return { data: null }; })
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
                executiveMetrics: {}
            }
        };
    }
};
