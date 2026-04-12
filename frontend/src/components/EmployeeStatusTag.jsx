/**
 * EmployeeStatusTag
 *
 * Displays the raw database employee_status with correct color coding.
 */

import React from 'react';

// Derive one of the tag configurations based on the raw status
export const getEmployeeTag = (status) => {
    const rawLabel = status || 'Unknown';
    const s = String(status || "").toLowerCase().trim();

    if (s.includes('notice')) {
        return {
            label: 'Notice period',
            color: 'bg-red-50 text-red-600 border-red-200',
            dot: 'bg-red-500',
        };
    }
    if (s.includes('pip')) {
        return {
            label: 'PIP',
            color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            dot: 'bg-yellow-500',
        };
    }
    if (s.includes('resign')) {
        return {
            label: 'Resigned',
            color: 'bg-gray-100 text-gray-500 border-gray-200',
            dot: 'bg-gray-400',
        };
    }
    if (s === 'partially allocated') {
        return {
            label: 'Partially allocated',
            color: 'bg-purple-50 text-purple-600 border-purple-200',
            dot: 'bg-purple-500',
        };
    }
    if (s === 'partially bench') {
        return {
            label: 'Partially bench',
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            dot: 'bg-blue-500',
        };
    }
    if (s === 'bench') {
        return {
            label: 'Bench',
            color: 'bg-orange-50 text-orange-600 border-orange-200',
            dot: 'bg-orange-500',
        };
    }
    if (s === 'allocated') {
        return {
            label: 'Allocated',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
        };
    }
    if (s === 'completed') {
        return {
            label: 'Completed',
            color: 'bg-slate-50 text-slate-500 border-slate-200',
            dot: 'bg-slate-400',
        };
    }

    // Default fallback for any other unexpected statuses
    return {
        label: rawLabel,
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
    };
};

const EmployeeStatusTag = ({ status, size = 'md' }) => {
    const tag = getEmployeeTag(status);

    const sizeClass = size === 'sm'
        ? 'px-2 py-0.5 text-[10px]'
        : 'px-2.5 py-1 text-xs';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md font-bold border ${tag.color} ${sizeClass} break-normal whitespace-nowrap`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tag.dot}`} />
            <span className="truncate max-w-[120px]" title={tag.label}>{tag.label}</span>
        </span>
    );
};

export default EmployeeStatusTag;
