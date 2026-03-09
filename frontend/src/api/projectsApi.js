import api from "./axios";

export const fetchProjectsData = async () => {
    try {
        const [overviewRes, listRes] = await Promise.all([
            api.get('/projects/overview').catch(() => ({ data: {} })),
            api.get('/projects/list').catch(() => ({ data: [] }))
        ]);

        const o = overviewRes?.data || {};
        const l = Array.isArray(listRes?.data) ? listRes.data : [];

        // Map Backend structure to Frontend Expected Structure
        const REAL_PROJECTS_DATA = {
            stats: {
                totalProjects: o.total_projects || 0,
                internalProjects: o.internal_projects || 0,
                clientProjects: o.client_projects || 0,
                ongoing: o.ongoing_projects || 0,
                pocsCount: o.poc_projects || 0
            },
            projects: l.map((p) => {
                // Determine display status pill color based on mapped status string from DB
                const s = (p.status || '').toLowerCase();
                let pillColor = "bg-gray-100 text-gray-600";

                if (s === "in progress" || s === "running") pillColor = "bg-blue-100 text-blue-600";
                else if (s === "completed" || s === "done" || s === "live" || s === "active") pillColor = "bg-green-100 text-green-600";
                else if (s === "delayed" || s === "on hold") pillColor = "bg-red-100 text-red-600";

                const isClient = p.type && (p.type.toLowerCase() === 'billable' || p.type.toLowerCase() === 'yes' || p.type.toLowerCase().includes('billable'));

                return {
                    id: p.project_id,
                    name: p.project_name,
                    statusText: "Active", // Default placeholder for secondary health text
                    statusColor: "text-green-500",
                    resources: p.resource_count || 0,
                    client: isClient ? 'Client' : 'Internal', // Basic mapping based on billable flag
                    startDate: p.start_date || "Not Set",
                    endDate: p.end_date || "TBD",
                    type: isClient ? 'Client' : 'Internal',
                    status: p.status,
                    statusPillColor: pillColor,
                    icon: p.project_name ? p.project_name.charAt(0).toUpperCase() : "P",
                    resourceNames: p.resource_names || "None"
                };
            })
        };

        return { data: REAL_PROJECTS_DATA };

    } catch (error) {
        console.error("Projects API Error:", error);
        // Fallback empty structure
        return {
            data: {
                stats: {
                    totalProjects: 0, internalProjects: 0, clientProjects: 0, ongoing: 0, pocsCount: 0
                },
                projects: []
            }
        };
    }
};
