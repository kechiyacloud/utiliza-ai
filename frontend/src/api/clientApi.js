import api from './axios';

export const createClient = async (clientData) => {
    try {
        const response = await api.post('/clients', clientData);
        return response.data;
    } catch (error) {
        console.error("Error creating client", error);
        throw error;
    }
};

export const updateClient = async (clientId, clientData) => {
    try {
        const response = await api.put(`/clients/${clientId}`, clientData);
        return response.data;
    } catch (error) {
        console.error("Error updating client", error);
        throw error;
    }
};

export const deleteClient = async (clientId) => {
    try {
        const response = await api.delete(`/clients/${clientId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting client", error);
        throw error;
    }
};

export const fetchClientsList = async () => {
    try {
        const response = await api.get('/clients');
        return response.data;
    } catch (error) {
        console.error("Error fetching clients list", error);
        return [];
    }
};

export const fetchClientData = async (filterText = '') => {
    try {
        const response = await api.get('/clients');
        const clients = Array.isArray(response.data) ? response.data : [];
        
        const filtered = filterText
            ? clients.filter(c =>
                (c.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
                (c.industry || '').toLowerCase().includes(filterText.toLowerCase())
            )
            : clients;

        // Dynamic Stats Calculation (No Mock Data)
        const totalClients = clients.length;
        const totalActiveProjects = clients.reduce((sum, c) => sum + (c.projects?.length || 0), 0);
        const totalOverallBudget = clients.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0);
        
        // Calculate average satisfaction or other metrics if available (Simulation for now based on project distribution)
        const onTrackCount = clients.reduce((sum, c) => sum + (c.projects?.filter(p => p.status === 'On Track').length || 0), 0);
        const healthPercent = totalActiveProjects > 0 ? (onTrackCount / totalActiveProjects) * 100 : 0;

        return {
            data: {
                stats: {
                    totalClients: { 
                        value: totalClients, 
                        label: "Total Strategic Partners", 
                        trend: "STABLE" 
                    },
                    activeProjects: { 
                        value: totalActiveProjects, 
                        label: "Active Project Flow", 
                        trend: totalActiveProjects > 0 ? "NORMAL" : "IDLE" 
                    },
                    totalRevenue: { 
                        value: `$${(totalOverallBudget / 1000000).toFixed(1)}M`, 
                        label: "Gross Budget Portfolio", 
                        trend: "0%" 
                    },
                    clientSatisfaction: { 
                        value: healthPercent > 0 ? `${healthPercent.toFixed(0)}%` : "N/A", 
                        label: "Avg Partner Health", 
                        trend: healthPercent > 80 ? "EXCELLENT" : "NORMAL" 
                    }
                },
                clients: filtered
            }
        };
    } catch (error) {
        console.error("Error fetching clients", error);
        return {
            data: {
                stats: {
                    totalClients: { value: 0, label: "Total Clients", trend: "" },
                    activeProjects: { value: 0, label: "Active Engagement", trend: "Normal" },
                    totalRevenue: { value: "$0", label: "Total Revenue", trend: "0%" },
                    clientSatisfaction: { value: "N/A", label: "Avg Satisfaction", trend: "Normal" }
                },
                clients: []
            }
        };
    }
};
