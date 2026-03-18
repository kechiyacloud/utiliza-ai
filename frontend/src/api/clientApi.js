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

        const totalClients = clients.length;
        const activeEngagements = clients.reduce((sum, c) => sum + (c.activeProjects || 0), 0);

        return {
            data: {
                stats: {
                    totalClients: { value: totalClients, label: "Total Clients", trend: "" },
                    activeProjects: { value: activeEngagements, label: "Active Engagement", trend: "Normal" },
                    totalRevenue: { value: "$0", label: "Total Revenue", trend: "0%" },
                    clientSatisfaction: { value: "N/A", label: "Avg Satisfaction", trend: "Normal" }
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
