/**
 * EmployeeStatusTag
 *
 * A single combined tag that merges allocation status + billable status
 * into one of four meaningful labels:
 *
 *  1. Allocated   + Billable     → "Active Billable"     (green)
 *  2. Allocated   + Non-Billable → "Internal"            (blue)
 *  3. Bench       + Non-Billable → "Bench"               (orange)
 *  4. Notice period              → "Serving Notice"      (red)
 *
 * Usage:
 *   <EmployeeStatusTag status={emp.employee_status} billable={emp.billable} />
 */

import React from 'react';

// Derive one of the 4 tag types from status + billable
export const getEmployeeTag = (status, billable) => {
    const s = (status || '').toLowerCase();
    const b = (billable || '').toLowerCase();

    if (s === 'notice period') {
        return {
            label: 'Serving Notice',
            color: 'bg-red-50 text-red-600 border-red-200',
            dot: 'bg-red-500',
        };
    }
    if (s === 'bench' && b === 'billable') {
        return {
            label: 'Shadow Billing',
            color: 'bg-purple-50 text-purple-600 border-purple-200',
            dot: 'bg-purple-500',
        };
    }
    if (s === 'bench') {
        return {
            label: 'Bench',
            color: 'bg-orange-50 text-orange-600 border-orange-200',
            dot: 'bg-orange-400',
        };
    }
    if (s === 'allocated' && b === 'non-billable') {
        return {
            label: 'Non-Billable',
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            dot: 'bg-blue-400',
        };
    }
    // Default: Allocated + Billable
    return {
        label: 'Active Billable',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    };
};

const EmployeeStatusTag = ({ status, billable, size = 'md' }) => {
    const tag = getEmployeeTag(status, billable);

    const sizeClass = size === 'sm'
        ? 'px-2 py-0.5 text-[10px]'
        : 'px-2.5 py-1 text-xs';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md font-bold border ${tag.color} ${sizeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tag.dot}`} />
            {tag.label}
        </span>
    );
};

export default EmployeeStatusTag;
