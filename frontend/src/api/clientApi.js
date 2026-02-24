// Data for Client Page
const clientData = {
    // Top Stats
    stats: {
        totalClients: { value: 0, label: "Total Clients", trend: "+0 this mo" },
        activeProjects: { value: 0, label: "Active Engagement", trend: "Normal" },
        totalRevenue: { value: "$0", label: "Total Revenue", trend: "0%" },
        clientSatisfaction: { value: "0", label: "Avg Satisfaction", trend: "Normal" }
    },

    // Client Directory
    clients: []
};

export const fetchClientData = async (filterText = '') => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (!filterText) {
                resolve({ data: clientData });
            } else {
                const filteredClients = clientData.clients.filter(client =>
                    client.name.toLowerCase().includes(filterText.toLowerCase()) ||
                    client.industry.toLowerCase().includes(filterText.toLowerCase())
                );
                resolve({ data: { ...clientData, clients: filteredClients } });
            }
        }, 500);
    });
};
