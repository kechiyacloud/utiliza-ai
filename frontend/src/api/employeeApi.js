import api from './axios';

// Fetch total employee count
export const getEmployeeCount = async () => {
    const res = await api.post('/employee/count');
    return res?.data?.count ?? res?.data ?? null;
};

// Fetch bench employee count
export const getBenchCount = async () => {
    const res = await api.post('/employee/bench');
    return res?.data?.count ?? res?.data ?? null;
};

// Fetch notice period employee count
export const getNoticeCount = async () => {
    const res = await api.post('/employee/notice');
    return res?.data?.count ?? res?.data ?? null;
};

// Global Cache to fix duplicate loading problems and speed up site
let employeeListCache = null;
let employeeListCacheTime = 0;
const clearEmployeeCache = () => {
    employeeListCache = null;
    employeeListCacheTime = 0;
    filterOptionsCache = null;
    filterCacheTime = 0;
};

// Fetch all employees list
export const getEmployeeList = async (forceUpdate = false) => {
    try {
        if (!forceUpdate && employeeListCache && (Date.now() - employeeListCacheTime < 5 * 60 * 1000)) {
            return employeeListCache;
        }

        const res = await api.get('/employees/list');
        const rawData = Array.isArray(res?.data) ? res.data : [];

        const enriched = rawData.map(emp => {
            const status = (emp.employee_status || '').toLowerCase();
            const allocation = emp.employee_allocations || 0;

            // Derive billable from raw status + allocation
            // Allocated + allocation > 0 → billable
            // Allocated + allocation = 0 → non-billable
            // Bench + any → non-billable (unless tagged shadow billing)
            // Notice period → non-billable
            let derivedBillable = 'non-billable';
            if (status === 'allocated' && allocation > 0) {
                derivedBillable = 'billable';
            }

            let normalizedType = emp.employee_type || 'Full Time';
            if (normalizedType.toUpperCase() === 'INTEN') {
                normalizedType = 'Intern';
            } else if (normalizedType.toUpperCase() === 'FTE') {
                normalizedType = 'Full Time';
            }

            return {
                ...emp,
                skills: emp.skills || [],
                billable: emp.billable || derivedBillable,
                employee_type: normalizedType,
                location: emp.location ? emp.location.replace(/^India - /, '') : emp.location,
            };
        }).filter(emp => !emp.date_of_resign);

        employeeListCache = enriched;
        employeeListCacheTime = Date.now();

        return enriched;

    } catch (err) {
        console.error('Error fetching employee list:', err);
        throw err;
    }
};

// Fetch single employee details by ID
export const getEmployeeById = async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
};

// Fetch upcoming bench employees
export const getUpcomingBench = async () => {
    try {
        const res = await api.get('/employees/upcoming-bench');
        return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
        console.error('Error fetching upcoming bench:', err);
        return [];
    }
};

// Fetch new joiners (last 30 days) — excludes notice period employees
export const getNewJoiners = async () => {
    try {
        const res = await api.get('/employees/new-joiners');
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            // Filter out notice period employees from real backend data
            return res.data.filter(emp =>
                (emp.employee_status || '').toLowerCase() !== 'notice period'
            );
        }
        throw new Error('Empty response');
    } catch (err) {
        console.error('Error fetching new joiners:', err);
        return [];
    }
};

// Fetch employee of the month
export const getEmployeeOfMonth = async () => {
    try {
        const res = await api.get('/employees/employee-of-month');
        if (res?.data) return res.data;
        throw new Error('Empty response');
    } catch (err) {
        console.error('Error fetching employee of the month:', err);
        return null;
    }
};

// Fetch top performers
export const getTopPerformers = async () => {
    try {
        const res = await api.get('/dashboard/top-performers');
        if (res?.data && Array.isArray(res.data)) {
            return res.data.map((p) => ({
                id: p.employee_id,
                name: p.employee_name,
                role: p.role || 'Top Performer',
                allocation: p.allocation ?? 0,
                avatar: p.employee_name ? p.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('') : "U"
            }));
        }
        return [];
    } catch (err) {
        console.error("Error fetching top performers:", err);
        return [];
    }
};

// Create new employee
export const createEmployee = async (employeeData) => {
    const res = await api.post('/employees', employeeData);
    clearEmployeeCache();
    return res.data;
};

// Update employee
export const updateEmployee = async (id, employeeData) => {
    const res = await api.put(`/employees/${id}`, employeeData);
    clearEmployeeCache();
    return res.data;
};

// Delete employee
export const deleteEmployee = async (id) => {
    const res = await api.delete(`/employees/${id}`);
    clearEmployeeCache();
    return res.data;
};

// Action Inbox Fetch
export const fetchActionInbox = async () => {
    try {
        const res = await api.get('/employees/action-inbox');
        if (res?.data && Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    } catch (err) {
        console.error('Error fetching action inbox:', err);
        return [];
    }
};

let filterOptionsCache = null;
let filterCacheTime = 0;

export const getFilterOptions = async (forceUpdate = false) => {
    try {
        if (!forceUpdate && filterOptionsCache && (Date.now() - filterCacheTime < 10 * 60 * 1000)) {
            return filterOptionsCache;
        }

        const res = await api.get('/employees/filter-options');
        if (res?.data) {
            // Normalize employee types identically to the list payload
            if (res.data.employee_types && Array.isArray(res.data.employee_types)) {
                res.data.employee_types = res.data.employee_types.map(t => {
                    let normalized = t || 'Full Time';
                    if (normalized.toUpperCase() === 'INTEN') return 'Intern';
                    if (normalized.toUpperCase() === 'FTE') return 'Full Time';
                    return normalized;
                });
                // Remove duplicates after mapping just in case
                res.data.employee_types = [...new Set(res.data.employee_types)].sort();
            }
            filterOptionsCache = res.data;
            filterCacheTime = Date.now();
        }
        return res?.data || null;
    } catch (err) {
        console.error('Error fetching filter options:', err);
        return null;
    }
};
