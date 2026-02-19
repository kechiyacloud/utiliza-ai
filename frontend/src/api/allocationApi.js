// Mock data for Allocation Page

const allocationData = {
    // Top Metric Cards
    metrics: {
        totalResources: { value: 420, trend: "+5%", label: "Total Resources" },
        billable: { value: 310, trend: "+2%", label: "Billable Count" },
        nonBillable: { value: 90, trend: "-1%", label: "Non-Billable" },
        benchStrength: { value: 110, trend: "+12%", label: "Bench Strength" },
        avgUtilization: { value: "74%", trend: "-2%", label: "Avg Utilization" },
        overallocated: { value: 18, trend: "+3", label: "Overallocated", isAlert: true }
    },

    // Organization Utilization Chart Data
    orgUtilization: {
        used: 74,
        available: 26,
        breakdown: [
            { label: "Billable", value: 65, color: "#3b82f6" }, // Blue
            { label: "Internal", value: 15, color: "#a855f7" }, // Purple
            { label: "Bench", value: 20, color: "#64748b" }     // Slate
        ]
    },

    // Department Utilization List
    departments: [
        { name: "Engineering", utilization: 85, bench: 5 },
        { name: "Design", utilization: 70, bench: 15 },
        { name: "DevOps", utilization: 90, bench: 2 },
        { name: "QA", utilization: 65, bench: 25 },
        { name: "Product", utilization: 80, bench: 10 },
    ],

    // Project Utilization Table
    projects: [
        { id: 1, name: "Alpha Cloud", billable: 120, nonBillable: 10, utilization: 92 },
        { id: 2, name: "Beta Launch", billable: 85, nonBillable: 5, utilization: 88 },
        { id: 3, name: "Internal Tools", billable: 0, nonBillable: 40, utilization: 45 },
        { id: 4, name: "Healthcare App", billable: 60, nonBillable: 15, utilization: 75 },
        { id: 5, name: "FinTech Core", billable: 45, nonBillable: 20, utilization: 65 },
    ],

    // Detailed Employee List
    employees: [
        { id: 1, name: "Sarah Smith", avatar: "SS", project: "Alpha Cloud", allocation: 120, type: "Billable", dept: "Engineering" },
        { id: 2, name: "John Doe", avatar: "JD", project: "Beta Launch", allocation: 100, type: "Billable", dept: "Engineering" },
        { id: 3, name: "Emma Wilson", avatar: "EW", project: "Internal Tools", allocation: 50, type: "Internal", dept: "Design" },
        { id: 4, name: "Mike Brown", avatar: "MB", project: "Bench", allocation: 0, type: "Bench", dept: "QA" },
        { id: 5, name: "Anna Davis", avatar: "AD", project: "Healthcare App", allocation: 80, type: "Billable", dept: "Product" },
        { id: 6, name: "Tom Wilson", avatar: "TW", project: "FinTech Core", allocation: 110, type: "Billable", dept: "Engineering" },
        { id: 7, name: "Lisa Ray", avatar: "LR", project: "Bench", allocation: 0, type: "Bench", dept: "Design" },
        { id: 8, name: "James Bond", avatar: "JB", project: "Alpha Cloud", allocation: 100, type: "Billable", dept: "DevOps" },
    ]
};

// Simulate API call with filtering
export const fetchAllocationData = async (filters = {}) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let filteredData = { ...allocationData };

            // 1. Filter Metrics (Simulated logic: Adjust values based on filters)
            if (filters.department && filters.department !== 'All Departments') {
                // Determine modifier based on dept string length (random-ish but deterministic)
                const modifier = filters.department.length % 2 === 0 ? 0.8 : 0.6;
                filteredData.metrics = {
                    totalResources: { ...filteredData.metrics.totalResources, value: Math.floor(420 * modifier) },
                    billable: { ...filteredData.metrics.billable, value: Math.floor(310 * modifier) },
                    nonBillable: { ...filteredData.metrics.nonBillable, value: Math.floor(90 * modifier) },
                    benchStrength: { ...filteredData.metrics.benchStrength, value: Math.floor(110 * modifier) },
                    avgUtilization: { ...filteredData.metrics.avgUtilization, value: Math.floor(74 * modifier) + "%" },
                    overallocated: { ...filteredData.metrics.overallocated, value: Math.floor(18 * modifier) }
                };
            }

            if (filters.resourceType && filters.resourceType !== 'All Resources') {
                // If filtering by Billable, set non-billable to 0, etc.
                if (filters.resourceType === 'Billable Only') {
                    filteredData.metrics = {
                        ...filteredData.metrics,
                        nonBillable: { ...filteredData.metrics.nonBillable, value: 0 },
                        benchStrength: { ...filteredData.metrics.benchStrength, value: 0 }
                    };
                } else if (filters.resourceType === 'Bench Strength') {
                    filteredData.metrics = {
                        ...filteredData.metrics,
                        billable: { ...filteredData.metrics.billable, value: 0 },
                        nonBillable: { ...filteredData.metrics.nonBillable, value: 0 }
                    };
                }
            }

            // 2. Filter Employees
            let filteredEmployees = allocationData.employees;

            if (filters.department && filters.department !== 'All Departments') {
                filteredEmployees = filteredEmployees.filter(emp => emp.dept === filters.department);
            }

            if (filters.resourceType && filters.resourceType !== 'All Resources') {
                if (filters.resourceType === 'Billable Only') {
                    filteredEmployees = filteredEmployees.filter(emp => emp.type === 'Billable');
                } else if (filters.resourceType === 'Internal Only') {
                    filteredEmployees = filteredEmployees.filter(emp => emp.type === 'Internal');
                } else if (filters.resourceType === 'Bench Strength') {
                    filteredEmployees = filteredEmployees.filter(emp => emp.type === 'Bench');
                }
            }

            filteredData.employees = filteredEmployees;

            resolve({ data: filteredData });
        }, 500); // Simulate network latency
    });
};
