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

// Fetch all employees list
export const getEmployeeList = async () => {
    try {
        const res = await api.get('/employees/list'); // removed timeout to rely on global or default
        const rawData = Array.isArray(res?.data) ? res.data : [];

        // Inject missing fields for real backend data if needed, or just return raw
        // Keeping the map for safety to ensure arrays are arrays
        const enriched = rawData.map(emp => ({
            ...emp,
            skills: emp.skills || [],
            billable: emp.billable || (emp.employee_status === 'Allocated' ? 'Billable' : 'Non-Billable'),
            location: emp.location ? emp.location.replace(/^India - /, '') : emp.location,
        }));

        return enriched;

    } catch (err) {
        console.error('Error fetching employee list:', err);
        throw err; // Propagate error to component
    }
};

// Fetch single employee details by ID
export const getEmployeeById = async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
};

// Fetch new joiners (last 90 days) — excludes notice period employees
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
                role: `${p.project_count} Projects`,
                allocation: 100,
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
    return res.data;
};

// Fetch action inbox
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

