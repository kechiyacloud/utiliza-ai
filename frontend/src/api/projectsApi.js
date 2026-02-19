import api from "./axios";

// MOCK DATA matching the "Projects Overview" image
const MOCK_PROJECTS_DATA = {
    stats: {
        totalProjects: 5,
        internalProjects: 1,
        clientProjects: 4,
        ongoing: 2,
        pocsCount: 1
    },
    projects: [
        {
            id: 1,
            name: "Healthcare Portal Remodel",
            statusText: "Healthy",
            statusColor: "text-green-500",
            resources: 4,
            client: "TechGlobal Inc",
            endDate: "2026-06-30",
            type: "Client",
            status: "In Progress",
            statusPillColor: "bg-blue-100 text-blue-600",
            icon: "H"
        },
        {
            id: 2,
            name: "Beta Platform Launch",
            statusText: "Critical",
            statusColor: "text-red-500",
            resources: 2,
            client: "FinServe Corp",
            endDate: "2026-03-15",
            type: "POC",
            status: "Delayed",
            statusPillColor: "bg-red-100 text-red-600",
            icon: "B"
        },
        {
            id: 3,
            name: "Internal Tooling",
            statusText: "Healthy",
            statusColor: "text-green-500",
            resources: 1,
            client: "Internal",
            endDate: "2026-12-31",
            type: "Internal",
            status: "Completed",
            statusPillColor: "bg-green-100 text-green-600",
            icon: "I"
        },
        {
            id: 4,
            name: "Healthcare Portal",
            statusText: "At Risk",
            statusColor: "text-orange-500",
            resources: 2,
            client: "HealthPlus Med",
            endDate: "2026-04-20",
            type: "Client",
            status: "In Progress",
            statusPillColor: "bg-blue-100 text-blue-600",
            icon: "H"
        },
        {
            id: 5,
            name: "Data Migration",
            statusText: "On Track",
            statusColor: "text-green-500",
            resources: 3,
            client: "MegaCorp",
            endDate: "2026-08-15",
            type: "Client",
            status: "In Progress",
            statusPillColor: "bg-blue-100 text-blue-600",
            icon: "D"
        }
    ]
};

export const fetchProjectsData = async () => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ data: MOCK_PROJECTS_DATA });
        }, 500);
    });
};
