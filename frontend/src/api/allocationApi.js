// Data for Allocation Page

const allocationData = {
    // Top Metric Cards
    metrics: {
        totalResources: { value: 0, trend: "0%", label: "Total Resources" },
        billable: { value: 0, trend: "0%", label: "Billable Count" },
        nonBillable: { value: 0, trend: "0%", label: "Non-Billable" },
        benchStrength: { value: 0, trend: "0%", label: "Bench Strength" },
        avgUtilization: { value: "0%", trend: "0%", label: "Avg Utilization" },
        overallocated: { value: 0, trend: "0", label: "Overallocated", isAlert: false }
    },

    // Organization Utilization Chart Data
    orgUtilization: {
        used: 0,
        available: 100,
        breakdown: []
    },

    // Department Utilization List
    departments: [],

    // Project Utilization Table
    projects: [],

    // Detailed Employee List
    employees: []
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
