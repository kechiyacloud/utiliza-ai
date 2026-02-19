// Mock data for Client Page

const clientData = {
    // Top Stats
    stats: {
        totalClients: { value: 34, label: "Total Clients", trend: "+2 this mo" },
        activeProjects: { value: 18, label: "Active Engagement", trend: "High" },
        totalRevenue: { value: "$2.4M", label: "Total Revenue", trend: "+12%" },
        clientSatisfaction: { value: "4.8", label: "Avg Satisfaction", trend: "Top Tier" }
    },

    // Client Directory
    clients: [
        {
            id: 1,
            name: "Globex Corp",
            logo: "GC",
            industry: "Retail",
            activeProjects: 3,
            totalBudget: 450000,
            health: "Stable",
            contact: "+1 (555) 123-4567",
            projects: [
                { name: "E-commerce Redesign", lead: "Sarah Smith", deadline: "Dec 15, 2026", status: "On Track" },
                { name: "Mobile App", lead: "Mike Jones", deadline: "Aug 20, 2026", status: "Delayed" },
                { name: "Loyalty Program", lead: "Jessica Wong", deadline: "Oct 05, 2026", status: "On Track" }
            ]
        },
        {
            id: 2,
            name: "TechNova",
            logo: "TN",
            industry: "SaaS",
            activeProjects: 2,
            totalBudget: 850000,
            health: "At Risk",
            contact: "+1 (555) 987-6543",
            projects: [
                { name: "Cloud Migration", lead: "David Lee", deadline: "Jun 30, 2026", status: "At Risk" },
                { name: "AI Integration", lead: "Emily Chen", deadline: "Sep 12, 2026", status: "On Track" }
            ]
        },
        {
            id: 3,
            name: "Acme Finance",
            logo: "AF",
            industry: "Finance",
            activeProjects: 5,
            totalBudget: 1200000,
            health: "Stable",
            contact: "+1 (555) 456-7890",
            projects: [
                { name: "Trading Platform", lead: "Robert Taylor", deadline: "Nov 01, 2026", status: "On Track" },
                { name: "Security Audit", lead: "Angela White", deadline: "July 15, 2026", status: "On Track" },
                { name: "API Gateway", lead: "Chris Martin", deadline: "Jan 20, 2027", status: "Delayed" }
            ]
        },
        {
            id: 4,
            name: "Stark Ind",
            logo: "SI",
            industry: "Defense",
            activeProjects: 1,
            totalBudget: 5000000,
            health: "Stable",
            contact: "+1 (555) 000-0000",
            projects: [
                { name: "Jarvis 2.0", lead: "Tony Stark", deadline: "May 30, 2030", status: "On Track" }
            ]
        },
        {
            id: 5,
            name: "Massive Dynamic",
            logo: "MD",
            industry: "Tech",
            activeProjects: 2,
            totalBudget: 2100000,
            health: "Growing",
            contact: "+1 (555) 111-2222",
            projects: [
                { name: "Quantum Chip", lead: "William Bell", deadline: "Dec 31, 2026", status: "On Track" },
                { name: "Synthetics", lead: "Nina Sharp", deadline: "Oct 15, 2026", status: "Delayed" }
            ]
        },
        {
            id: 6,
            name: "Cyberdyne",
            logo: "CY",
            industry: "AI",
            activeProjects: 1,
            totalBudget: 3500000,
            health: "Stable",
            contact: "+1 (555) 333-4444",
            projects: [
                { name: "Skynet Core", lead: "Miles Dyson", deadline: "Aug 29, 2026", status: "At Risk" }
            ]
        },
        {
            id: 7,
            name: "Wayne Ent",
            logo: "WE",
            industry: "Conglomerate",
            activeProjects: 4,
            totalBudget: 4200000,
            health: "Stable",
            contact: "+1 (555) 555-5555",
            projects: [
                { name: "Batmobile V2", lead: "Lucius Fox", deadline: "Nov 15, 2026", status: "On Track" },
                { name: "Manor Reno", lead: "Alfred P.", deadline: "Sep 01, 2026", status: "On Track" }
            ]
        },
        {
            id: 8,
            name: "Umbrella Corp",
            logo: "UC",
            industry: "Pharma",
            activeProjects: 2,
            totalBudget: 1800000,
            health: "At Risk",
            contact: "+1 (555) 666-7777",
            projects: [
                { name: "T-Virus Research", lead: "Albert Wesker", deadline: "July 01, 2026", status: "At Risk" },
                { name: "Hive Security", lead: "Red Queen", deadline: "Dec 31, 2026", status: "On Track" }
            ]
        }
    ]
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
