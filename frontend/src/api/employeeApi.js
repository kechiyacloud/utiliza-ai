import api from './axios';

// Fetch total employee count
export const getEmployeeCount = async () => {
    const res = await api.get('/employees/count');
    return res?.data?.total_employees ?? 0;
};

// Fetch bench employee count
export const getBenchCount = async () => {
    const res = await api.get('/employees/bench/count');
    return res?.data?.bench_employees ?? 0;
};

// Fetch notice period employee count
export const getNoticeCount = async () => {
    const res = await api.get('/employees/notice/count');
    return res?.data?.notice_employees ?? 0;
};

// Global Cache to fix duplicate loading problems and speed up site
let employeeListCache = null;
let employeeListCacheTime = 0;
const clearEmployeeCache = () => {
    employeeListCache = null;
    employeeListCacheTime = Date.now();
    filterOptionsCache = null;
    filterCacheTime = 0;
};

// Fetch all employees list
export const getEmployeeList = async (forceUpdate = false, includeResigned = false, includeDeleted = false) => {
    try {
        // Cache only applies for default view (no resigned or deleted employees)
        if (!includeResigned && !includeDeleted && !forceUpdate && employeeListCache && (Date.now() - employeeListCacheTime < 5 * 60 * 1000)) {
            return employeeListCache;
        }

        const res = await api.get('/employees/list', { 
            params: { 
                include_resigned: includeResigned,
                include_deleted: includeDeleted
            } 
        });
        const rawData = Array.isArray(res?.data) ? res.data : [];

        const enriched = rawData.map(emp => {
            const status = (emp.employee_status || '').toLowerCase();
            const allocation = emp.employee_allocations || 0;

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
        });

        if (!includeResigned) {
            employeeListCache = enriched;
            employeeListCacheTime = Date.now();
        }

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

// Nominate employee of the month
export const nominateEmployee = async (nominationData) => {
    const res = await api.post('/employees/nominate', nominationData);
    return res.data;
};

// Create new employee
export const createEmployee = async (employeeData, upsert = false) => {
    const res = await api.post(`/employees?upsert=${upsert}`, employeeData);
    clearEmployeeCache();
    return res.data;
};

// Update employee
export const updateEmployee = async (id, employeeData) => {
    const res = await api.put(`/employees/${id}`, employeeData);
    clearEmployeeCache();
    return res.data;
};

// Restore employee
export const restoreEmployee = async (id) => {
    const res = await api.put(`/employees/${id}/restore`);
    clearEmployeeCache();
    return res.data;
};

// Delete employee
export const deleteEmployee = async (id, permanent = false) => {
    const res = await api.delete(`/employees/${id}`, {
        params: { permanent }
    });
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
            if (res.data.employee_types && Array.isArray(res.data.employee_types)) {
                res.data.employee_types = res.data.employee_types.map(t => {
                    let normalized = t || 'Full Time';
                    if (normalized.toUpperCase() === 'INTEN') return 'Intern';
                    if (normalized.toUpperCase() === 'FTE') return 'Full Time';
                    return normalized;
                });
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
