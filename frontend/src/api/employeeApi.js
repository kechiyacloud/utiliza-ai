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
    const skillsPool = ['Java', 'Spring', 'Angular', 'Azure', 'C#', '.NET', 'GCP', 'Flutter', 'React', 'Node.js', 'Python', 'Docker'];
    const depts = ['Software Engineering', 'Data Engineering', 'Quality Engineering', 'Cloud Solutions Engineering', 'Product Engineering', 'HR', 'Finance', 'PMO'];
    const locs = ['India - Chennai', 'India - Coimbatore', 'USA', 'Malaysia', 'Canada'];
    const roles = ['Senior Engineer', 'Lead Engineer', 'Junior Engineer', 'Manager', 'Architect', 'Consultant', 'Analyst', 'Associate'];
    const types = ['Full Time', 'Contract', 'Intern', 'Consultant'];
    const statuses = ['Allocated', 'Allocated', 'Allocated', 'Bench', 'Notice period']; // weighted

    const generateBase = (count = 60) =>
        Array.from({ length: count }, (_, i) => {
            const status = statuses[i % statuses.length];
            const isAllocated = status === 'Allocated';
            return {
                employee_id: `EMP-${1001 + i}`,
                employee_name: [
                    'Arjun Sharma', 'Priya Nair', 'Ravi Kumar', 'Ananya Iyer', 'Karthik Raj',
                    'Sneha Pillai', 'Vikram Menon', 'Divya Suresh', 'Arun Patel', 'Meera Balan',
                    'Suresh Babu', 'Lakshmi Devi', 'Rahul Verma', 'Pooja Krishnan', 'Nikhil Das',
                    'Kavya Reddy', 'Sanjay Gupta', 'Deepa Nambiar', 'Ajay Singh', 'Swathi Mohan'
                ][i % 20],
                role_designation: roles[i % roles.length],
                department: depts[i % depts.length],
                location: locs[i % locs.length],
                photo_url: `https://i.pravatar.cc/150?img=${(i % 50) + 10}`,
                employee_status: status,
                employee_allocations: isAllocated ? [80, 100, 120][i % 3] : 0,
                employeeType: types[i % types.length],
                date_of_joining: status === 'Notice period'
                    ? new Date(Date.now() - ((200 + i) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]  // always 200+ days ago
                    : new Date(Date.now() - (i * 20 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                billable: isAllocated ? (i % 4 !== 0 ? 'Billable' : 'Non-Billable') : 'Non-Billable',
                skills: [skillsPool[i % skillsPool.length], skillsPool[(i + 3) % skillsPool.length], 'SQL', 'Git']
            };
        });

    // Add 2 explicit Shadow Billing employees (Bench + Billable)
    const shadowBillingEmployees = [
        {
            employee_id: 'EMP-2001',
            employee_name: 'Rohan Mehta',
            role_designation: 'Senior Consultant',
            department: 'Software Engineering',
            location: 'India - Chennai',
            photo_url: 'https://i.pravatar.cc/150?img=60',
            employee_status: 'Bench',
            employee_allocations: 0,
            employeeType: 'Contract',
            date_of_joining: new Date(Date.now() - (300 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            billable: 'Billable',
            skills: ['Java', 'Spring', 'SQL', 'Git']
        },
        {
            employee_id: 'EMP-2002',
            employee_name: 'Nisha Kapoor',
            role_designation: 'Lead Analyst',
            department: 'Data Engineering',
            location: 'India - Coimbatore',
            photo_url: 'https://i.pravatar.cc/150?img=61',
            employee_status: 'Bench',
            employee_allocations: 0,
            employeeType: 'Full Time',
            date_of_joining: new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            billable: 'Billable',
            skills: ['Python', 'Azure', 'SQL', 'Git']
        }
    ];

    const generateMockEmployees = (count = 60) => [...generateBase(count), ...shadowBillingEmployees];

    try {
        const res = await api.get('/employees/list', { timeout: 2000 }); // 2s timeout for fast fallback
        const rawData = Array.isArray(res?.data) ? res.data : [];

        if (rawData.length === 0) {
            return generateMockEmployees(60);
        }

        // Inject missing fields for real backend data
        const enriched = rawData.map(emp => ({
            ...emp,
            skills: emp.skills || ['React', 'Node.js', 'Python', 'AWS'],
            billable: emp.billable || (emp.employee_status === 'Allocated' ? 'Billable' : 'Non-Billable'),
        }));

        // Pad to 60 for pagination demo
        if (enriched.length < 60) {
            const mocks = generateMockEmployees(60 - enriched.length);
            return [...enriched, ...mocks];
        }
        return enriched;

    } catch (err) {
        console.warn('Backend unavailable, using mock employee data:', err.message);
        return generateMockEmployees(60);
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
    } catch {
        // Fallback: derive new joiners from mock employee list
        const allEmp = await getEmployeeList();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        return allEmp.filter(emp => {
            const isNew = emp.date_of_joining && new Date(emp.date_of_joining) >= cutoff;
            const notNotice = (emp.employee_status || '').toLowerCase() !== 'notice period';
            return isNew && notNotice;
        });
    }
};

// Fetch employee of the month — with mock fallback
export const getEmployeeOfMonth = async () => {
    try {
        const res = await api.get('/employees/employee-of-month', { timeout: 1500 });
        if (res?.data) return res.data;
        throw new Error('No data');
    } catch {
        // Fallback: pick the allocated + billable employee with highest allocation from mock data
        const allEmp = await getEmployeeList();
        const top = allEmp
            .filter(e => e.employee_status === 'Allocated' && e.billable === 'Billable')
            .sort((a, b) => (b.employee_allocations || 0) - (a.employee_allocations || 0))[0];
        return top || allEmp[0];
    }
};

// Create new employee
export const createEmployee = async (employeeData) => {
    const res = await api.post('/employees', employeeData);
    return res.data;
};

