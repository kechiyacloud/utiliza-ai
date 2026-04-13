import api from "./axios";

<<<<<<< HEAD
export const fetchProjectsData = async () => {
    try {
        const [overviewRes, listRes] = await Promise.all([
            api.get('/projects/overview').catch(() => ({ data: {} })),
            api.get('/projects/list').catch(() => ({ data: [] }))
=======
export const fetchProjectsData = async (filters = {}) => {
    try {
        const params = { ...filters };
        const [overviewRes, listRes] = await Promise.all([
            api.get('/projects/overview', { params }).catch(() => ({ data: {} })),
            api.get('/projects/list', { params }).catch(() => ({ data: [] }))
>>>>>>> c6d4574 (resolve conflicts)
        ]);

        const o = overviewRes?.data || {};
        const l = Array.isArray(listRes?.data) ? listRes.data : [];

        // Map Backend structure to Frontend Expected Structure
        const REAL_PROJECTS_DATA = {
            stats: {
                totalProjects: o.total_projects || 0,
                internalProjects: o.internal_projects || 0,
                clientProjects: o.client_projects || o.external_projects || 0,
                externalProjects: o.client_projects || o.external_projects || 0,
                ongoing: o.ongoing_projects || 0,
                partnerCount: o.partner_projects || 0,
                completedProjects: o.completed_projects || 0,
                upcoming_projects: o.upcoming_projects || 0,
            },
            projects: l.map((p) => {
                // Determine display status pill color based on mapped status string from DB
                const s = (p.status || '').toLowerCase();
                let pillColor = "bg-gray-100 text-gray-600";

                if (s === "in progress" || s === "running") pillColor = { backgroundColor: '#DBEAFE', color: '#1E40AF' };
                else if (s === "live" || s === "active") pillColor = { backgroundColor: '#DCFCE7', color: '#166534' };
                else if (s === "closed" || s === "completed" || s === "done" || s === "ended" || s === "end") pillColor = { backgroundColor: '#DBEAFE', color: '#1E40AF' };
                else if (s === "on hold" || s === "delayed") pillColor = { backgroundColor: '#FEE2E2', color: '#991B1B' };
                else if (s === "not started" || s === "planned") pillColor = { backgroundColor: '#FEF3C7', color: '#92400E' };

                // Backend already maps billable to 'Client' or 'Internal' in the list endpoint
                const type = p.type || 'Internal';
                const clientName = p.client_name || type;

                return {
                    id: p.project_id,
                    name: p.project_name,
                    statusText: "Active",
                    statusColor: "text-green-500",
                    resource_count: p.resource_count || 0,
<<<<<<< HEAD
                    team_members: Array.isArray(p.team_members) ? p.team_members : [],
=======
                    resources: p.team_members || [], // resources should be the list of members for AvatarStack
                    team_members: p.team_members || [],
>>>>>>> c6d4574 (resolve conflicts)
                    client: clientName,
                    startDate: p.start_date || "",
                    endDate: p.end_date || "",
                    type: type,
                    status: p.status,
                    raw_status: p.raw_status || p.status,
                    sub_status: p.sub_status || null,
                    subStatus: p.sub_status || null,
                    statusPillColor: pillColor,
                    billable: (p.billable || '').replace(/\s+/g, ''),
                    icon: p.project_name ? p.project_name.charAt(0).toUpperCase() : "P",
<<<<<<< HEAD
                    resourceNames: p.resource_names || "None",
                    client_name: p.client_name || null,
                    partner_name: p.partner_name || null,
                    client_id: p.client_id || null,
                    partner_id: p.partner_id || null,
                    department_id: p.department_id || null,
                    department_name: p.department_name || null,
=======
                    resourceNames: p.resource_names || "None"
>>>>>>> c6d4574 (resolve conflicts)
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
<<<<<<< HEAD
                    totalProjects: 0, internalProjects: 0, clientProjects: 0, ongoing: 0, partnerCount: 0, completedProjects: 0
=======
                    totalProjects: 0,
                    internalProjects: 0,
                    externalProjects: 0,
                    ongoing: 0,
                    partnerCount: 0,
                    completedProjects: 0,
                    upcoming_projects: 0
>>>>>>> c6d4574 (resolve conflicts)
                },
                projects: []
            }
        };
    }
};

export const createProject = async (projectData) => {
    const res = await api.post('/projects', projectData);
    return res.data;
};

export const updateProject = async (id, projectData) => {
    const res = await api.put(`/projects/${id}`, projectData);
    return res.data;
};

export const deleteProject = async (id) => {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
};
