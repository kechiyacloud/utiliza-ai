/**
 * Centralized utility to compute employee status consistently across the frontend.
 */
export const getEmployeeStatus = (employee) => {
    if (!employee) return 'Bench';

    const status = (employee.employee_status || '').toLowerCase().trim();
    if (status.includes('notice')) return 'Notice Period';
    if (status.includes('pip')) return 'PIP';
    if (status.includes('resign') || status.includes('terminate')) return 'Resigned';
    if (status.includes('leadership')) return 'Leadership';
    if (status.includes('internal operations') || status === 'internal_operations') return 'Internal Operations';
    if (status.includes('system account') || status === 'system_account') return 'System account';

    // 1. Leadership Status Rules (contains director, vice president, vp, head)
    const desig = (employee.role_designation || employee.designation || '').toLowerCase().trim();
    const leadershipKeywords = ['director', 'vice president', 'vp', 'head',  'ceo', 'chief executive', 'founder', 'president'];
    if (leadershipKeywords.some(keyword => desig.includes(keyword))) {
        return 'Leadership';
    }

    // 3. Internal teams -> Internal Operations
    const dept = (employee.department || '').toLowerCase().trim();
    const internalDepts = ['hr', 'finance', 'it operations', 'system operations', 'exo', 'management', 'training & development'];
    if (internalDepts.some(d => dept === d || dept.includes(d))) {
        return 'Internal Operations';
    }

    // 4. Allocated delivery employees -> Allocated
    const allocation = employee.employee_allocations || 0;
    if (allocation > 0) {
        return 'Allocated';
    }

    // 5. Unallocated delivery employees -> Bench
    return 'Bench';
};
