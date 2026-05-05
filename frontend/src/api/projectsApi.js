import api from "./axios";

export const fetchProjectDepartments = async () => {
    try {
        const response = await api.get('/projects/departments');
        return response.data || [];
    } catch (error) {
        console.error("Fetch Project Departments Error:", error);
        return [];
    }
};

/**
 * Fetch projects overview and list data.
 * @param {Object} filters - Optional filters (e.g. { department: '...' })
 */
export const fetchProjectsData = async (filters = {}) => {
    try {
        const apiParams = {
            ...filters,
            resource_name: filters.resourceName,
            project_name: filters.projectName,
            sow_status: filters.sowStatus,
            start_date: filters.startDate,
            end_date: filters.endDate,
            startDate: filters.startDate,
            endDate: filters.endDate
        };

        console.log("[ProjectsAPI] Fetching with params:", apiParams);
        const [overviewRes, listRes] = await Promise.all([
            api.get('/projects/overview', { params: apiParams }),
            api.get('/projects/list', { params: apiParams })
        ]);

        const o = overviewRes?.data || {};
        const l = Array.isArray(listRes?.data) ? listRes.data : [];
        console.log(`[ProjectsAPI] Overview total: ${o.totalProjects ?? o.total_projects}, List count: ${l.length}`);

        // Map Backend structure to Frontend Expected Structure
        const REAL_PROJECTS_DATA = {
            stats: {
                totalProjects: o.totalProjects ?? o.total_projects ?? 0,
                internalProjects: o.internalProjects ?? o.internal_projects ?? 0,
                externalProjects: o.externalProjects ?? o.external_projects ?? o.clientProjects ?? o.client_projects ?? 0,
                ongoingProjects: o.ongoingProjects ?? o.ongoing_projects ?? 0,
                overdueProjects: o.overdueProjects ?? 0,
                endingSoonProjects: o.endingSoonProjects ?? 0,
                completedProjects: o.completedProjects ?? o.completed_projects ?? 0,
                upcomingProjects: o.upcomingProjects ?? o.upcoming_projects ?? 0,
            },
            projects: l.map((p) => {
                // Determine display status pill color based on mapped status string from DB
                const s = (p.status || '').toLowerCase();
                let pillColor = { backgroundColor: '#F1F5F9', color: '#475569' }; // Default gray

                if (s === "in progress" || s === "running") {
                    pillColor = { backgroundColor: '#DBEAFE', color: '#1E40AF' };
                } else if (s === "live" || s === "active") {
                    pillColor = { backgroundColor: '#DCFCE7', color: '#166534' };
                } else if (s === "closed" || s === "completed" || s === "done" || s === "ended" || s === "end") {
                    pillColor = { backgroundColor: '#F1F5F9', color: '#475569' };
                } else if (s === "on hold" || s === "delayed") {
                    pillColor = { backgroundColor: '#FEE2E2', color: '#991B1B' };
                } else if (s === "not started" || s === "planned") {
                    pillColor = { backgroundColor: '#FEF3C7', color: '#92400E' };
                }

                const type = p.type || 'Internal';
                const clientName = p.client_name || type;

                return {
                    id: p.project_id,
                    project_id: p.project_id,
                    uuid: p.uuid || null,
                    name: p.project_name,
                    statusText: "Active",
                    statusColor: "text-green-500",
                    resource_count: p.resource_count || 0,
                    resources: p.team_members || [],
                    team_members: p.team_members || [],
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
                    resourceNames: p.resource_names || "None",
                    client_name: p.client_name || null,
                    partner_name: p.partner_name || null,
                    client_id: p.client_id || null,
                    partner_id: p.partner_id || null,
                    department_id: p.department_id || null,
                    department_name: p.department_name || null
                };
            })
        };

        return { data: REAL_PROJECTS_DATA };

    } catch (error) {
        console.error("Projects API General Error:", error);
        return {
            data: {
                stats: {
                    totalProjects: 0,
                    internalProjects: 0,
                    clientProjects: 0,
                    externalProjects: 0,
                    ongoing: 0,
                    partnerCount: 0,
                    completedProjects: 0,
                    upcoming_projects: 0
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
