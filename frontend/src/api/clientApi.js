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
        const res = await api.get('/clients');
        const clients = Array.isArray(res.data) ? res.data : [];
        
        // Filter if needed
        const filtered = !filterText ? clients : clients.filter(c => 
            c.name.toLowerCase().includes(filterText.toLowerCase()) ||
            c.industry.toLowerCase().includes(filterText.toLowerCase())
        );

        return {
            data: {
                stats: {
                    totalClients: { value: clients.length, label: "Total Clients", trend: "+0 this mo" },
                    activeProjects: { value: 0, label: "Active Engagement", trend: "Normal" },
                    totalRevenue: { value: "$0", label: "Total Revenue", trend: "0%" },
                    clientSatisfaction: { value: "0", label: "Avg Satisfaction", trend: "Normal" }
                },
                clients: filtered
            }
        };
    } catch (error) {
        console.error("Error fetching client data", error);
        return { data: { stats: { totalClients: { value: 0 } }, clients: [] } };
    }
};
