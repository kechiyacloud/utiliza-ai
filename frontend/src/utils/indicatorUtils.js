import React from 'react';
import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';

/**
 * Computes the number of calendar days remaining until a given ISO date string.
 * @param {string|null} dateStr - "YYYY-MM-DD"
 * @returns {number|null}
 */
const calcDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

/**
 * Calculates the offboarding/allocation ending status for a resource.
 * Used in ProjectEmployeeAllocation (Project Allocation Details panel).
 *
 * @param {Object} employee  - employee record from the backend
 * @param {number} leavingThreshold      - days threshold for "Leaving Soon"   (default 30)
 * @param {number} allocEndingThreshold  - days threshold for "Allocation Ending" (default 30)
 * @returns {Object|null}  badge descriptor, or null if no indicator applies
 */
export const getOffboardingStatus = (employee, leavingThreshold = 30, allocEndingThreshold = 30) => {
    if (!employee) return null;

    const {
        leaving_in_days,
        allocation_ending_in_days,
        employee_status,
        notice_end_date,
    } = employee;

    const isNotice = employee_status && employee_status.toLowerCase().includes('notice');

    // ── 1. Notice Period (evaluated first) ────────────────────────────────────
    // Uses notice_end_date directly so the countdown is accurate regardless of
    // whether date_of_resign is also set.
    if (isNotice) {
        const noticeDaysLeft = calcDaysLeft(notice_end_date);

        if (noticeDaysLeft !== null && noticeDaysLeft >= 0 && noticeDaysLeft <= 30) {
            // Within the 30-day warning window — show countdown label
            const dayWord = noticeDaysLeft === 1 ? 'day' : 'days';
            return {
                type:    'warning',
                label:   'Notice Period (' + noticeDaysLeft + ' ' + dayWord + ' left)',
                tooltip: 'Serving notice period. ' + noticeDaysLeft + ' ' + dayWord + ' remaining until last working day.',
                color:   'bg-orange-50 text-orange-600 border border-orange-100',
                icon:    React.createElement(Clock, { size: 12, className: 'text-orange-500' }),
            };
        }

        // Notice employee but > 30 days left, or no end date recorded
        const tooltipText = (noticeDaysLeft !== null && noticeDaysLeft > 30)
            ? ('Last day in ' + noticeDaysLeft + ' days')
            : 'Notice Period';
        return {
            type:    'warning',
            label:   'Notice Period',
            tooltip: tooltipText,
            color:   'bg-orange-50 text-orange-600 border border-orange-100',
            icon:    React.createElement(Clock, { size: 12, className: 'text-orange-500' }),
        };
    }

    // ── 2. Leaving Soon (non-notice resign) ───────────────────────────────────
    if (leaving_in_days !== undefined && leaving_in_days !== null) {
        if (leaving_in_days <= leavingThreshold && leaving_in_days >= 0) {
            return {
                type:    'critical',
                label:   'Leaving Soon',
                tooltip: 'Leaving in ' + leaving_in_days + ' day(s)',
                color:   'bg-red-50 text-red-600 border border-red-100',
                icon:    React.createElement(AlertCircle, { size: 12, className: 'text-red-500' }),
            };
        }
    }

    // ── 3. Allocation Ending Soon ─────────────────────────────────────────────
    if (allocation_ending_in_days !== undefined && allocation_ending_in_days !== null) {
        if (allocation_ending_in_days <= allocEndingThreshold && allocation_ending_in_days >= 0) {
            return {
                type:    'info',
                label:   'Allocation Ending',
                tooltip: 'Allocation ends in ' + allocation_ending_in_days + ' day(s)',
                color:   'bg-amber-50 text-amber-600 border border-amber-100',
                icon:    React.createElement(AlertTriangle, { size: 12, className: 'text-amber-500' }),
            };
        }
    }

    return null;
};
