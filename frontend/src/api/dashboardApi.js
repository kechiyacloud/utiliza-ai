import api from "./axios";

// MOCK DATA matching the requirements/images
const MOCK_DASHBOARD_DATA = {
    executiveCards: {
        totalEmployees: { value: 450, change: "+5 from last week", label: "Total Employees" },
        activeClients: { value: 12, change: "2 New this month", label: "Active Clients" },
        runningProjects: { value: 32, change: "", label: "Running Projects", alertCount: 2 },
        benchStrength: { value: 45, change: "10% of total workforce", label: "Bench Strength" }
    },
    resourceForecast: [
        { month: 'Jan', totalEmployees: 450, allocated: 380 },
        { month: 'Feb', totalEmployees: 460, allocated: 400 },
        { month: 'Mar', totalEmployees: 480, allocated: 420 },
    ],
    highAllocationProjects: [
        { id: 1, name: "Internal Tooling", resources: 1, utilization: 100 },
        { id: 2, name: "Beta Platform Launch", resources: 2, utilization: 90 },
        { id: 3, name: "Healthcare Portal Remodel", resources: 4, utilization: 81 },
    ],
    topPerformers: [
        { id: 1, name: "Sarah Wilson", role: "Senior DevOps", allocation: 100, avatar: "SW" },
        { id: 2, name: "James Chen", role: "Tech Lead", allocation: 95, avatar: "JC" },
        { id: 3, name: "Anita Roy", role: "Product Owner", allocation: 90, avatar: "AR" },
    ],
    resourceAvailability: [
        { id: "C", name: "Charlie Brown", project: "Beta Platform Launch", releaseDate: "2026-03-15", availability: 0 },
        { id: "A", name: "Alice Johnson", project: "Beta Platform Launch", releaseDate: "2026-03-15", availability: 20 },
        { id: "D", name: "Diana Prince", project: "Healthcare Portal", releaseDate: "2026-04-20", availability: 25 },
    ]
};

export const fetchDashboardData = async () => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ data: MOCK_DASHBOARD_DATA });
        }, 500);
    });

    // In real app, uncomment below:
    // const response = await api.get("/dashboard/summary");
    // return response.data;
};
