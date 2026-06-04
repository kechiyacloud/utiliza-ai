/**
 * allocationWeeks.js
 * Utility functions for generating week descriptors used by the
 * Resource Allocation & Planning table in ProjectDetailsPage.
 *
 * Extracted from the original inline helpers in ProjectDetailsPage.jsx.
 * Upcoming tab fix: Current Week is excluded from the Upcoming view.
 */

// ─── Low-level date helpers ───────────────────────────────────────────────────

/**
 * Returns a Date object for the Monday of the ISO week containing `date`.
 * Sunday (getDay() === 0) is treated as day 7 so that it falls in the
 * previous ISO week, not the next one.
 */
export function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Returns the Monday of the ISO week specified by a "YYYY-WW" string. */
export function getMondayFromISOWeek(yearWeekStr) {
    if (!yearWeekStr) return null;
    const parts = yearWeekStr.split('-');
    if (parts.length !== 2) return null;
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(week)) return null;

    // Jan 4 is always in ISO week 1.
    const simple = new Date(year, 0, 4);
    const dayOfWeek = simple.getDay() || 7;
    const dayOfISOWeek1Monday = 4 - dayOfWeek + 1;
    const mondayOfTargetWeek = new Date(year, 0, dayOfISOWeek1Monday + (week - 1) * 7);
    mondayOfTargetWeek.setHours(0, 0, 0, 0);
    return mondayOfTargetWeek;
}

/** Returns the ISO week number (1-53) for a given date. */
export function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Returns the ISO year for a given date (may differ from calendar year at year boundaries). */
export function getISOYear(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    return d.getFullYear();
}

/** Formats a Date as a short locale string like "Mar 17". */
function fmtDate(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Week status / labelling ──────────────────────────────────────────────────

/**
 * Returns 'previous' | 'current' | 'upcoming' relative to `today`.
 */
export function getWeekStatus(weekStartDate, weekEndDate, today = new Date()) {
    const start = new Date(weekStartDate); start.setHours(0, 0, 0, 0);
    const end = new Date(weekEndDate); end.setHours(23, 59, 59, 999);
    const t = new Date(today); t.setHours(0, 0, 0, 0);
    if (end < t) return 'previous';
    if (start <= t && t <= end) return 'current';
    return 'upcoming';
}

/**
 * Returns a human-readable label for the week whose Monday is `mondayDate`.
 * Examples: "Current Week", "Next Week", "Week +2", "Previous Week", "Week -2".
 */
function getDynamicWeekLabel(mondayDate, fallbackIndex = 1) {
    const currentMonday = getMonday(new Date());
    const diffWeeks = Math.round(
        (getMonday(mondayDate).getTime() - currentMonday.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );

    if (diffWeeks === 0) return 'Current Week';
    if (diffWeeks === 1) return 'Next Week';
    if (diffWeeks > 1) return `Week +${diffWeeks}`;
    if (diffWeeks === -1) return 'Previous Week';
    if (diffWeeks < -1) return `Week ${diffWeeks}`;
    return `Week ${fallbackIndex}`;
}

// ─── Week descriptor builder ──────────────────────────────────────────────────

/**
 * Builds a week descriptor object for the week starting on `mondayDate`.
 *
 * Shape:
 *   { label, dateRange, yearWeek, year, weekNum, monday, sunday,
 *     start, end, isPast, isCurrent, isFuture }
 */
export function buildWeekDescriptor(mondayDate, index) {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const status = getWeekStatus(mondayDate, sunday, today);
    const isPast = status === 'previous';
    const isCurrent = status === 'current';
    const isFuture = status === 'upcoming';

    const wkNum = getISOWeekNumber(mondayDate);
    const yr = getISOYear(mondayDate);
    const yearWeek = `${yr}-${wkNum}`;

    const label = getDynamicWeekLabel(mondayDate, index);

    return {
        label,
        dateRange: `${fmtDate(mondayDate)} - ${fmtDate(sunday)}`,
        yearWeek,
        year: yr,
        weekNum: wkNum,
        monday: new Date(mondayDate),
        sunday: new Date(sunday),
        start: new Date(mondayDate),
        end: new Date(sunday),
        isPast,
        isCurrent,
        isFuture,
    };
}

// ─── Range generators ─────────────────────────────────────────────────────────

/**
 * Generates an array of week descriptors from `startMonday` to `endMonday`
 * (both inclusive). Capped at 400 weeks to prevent runaway loops.
 */
export function generateWeeksBetween(startMonday, endMonday) {
    if (!startMonday || !endMonday || startMonday > endMonday) return [];
    const weeks = [];
    let cursor = new Date(startMonday);
    let index = 1;
    while (cursor <= endMonday && weeks.length < 400) {
        weeks.push(buildWeekDescriptor(cursor, index));
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
        index += 1;
    }
    return weeks;
}

/**
 * Returns the current week + the next 3 weeks (4 weeks total).
 * Used by the "Current" tab.
 */
export function getCurrentFourWeeks(currentMonday) {
    const out = [];
    for (let i = 0; i < 4; i++) {
        const monday = new Date(currentMonday);
        monday.setDate(currentMonday.getDate() + i * 7);
        out.push(buildWeekDescriptor(monday, i + 1));
    }
    return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Safely parses a date value (string, Date, or null/undefined) into a Date
 * object normalised to midnight, or null if the value is invalid.
 */
export function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Returns the visible week descriptors for the given `mode`.
 *
 * @param {'previous'|'current'|'upcoming'} mode
 * @param {Date|string|null} allocationStartDate  - Project / allocation start
 * @param {Date|string|null} allocationEndDate    - Project / allocation end
 * @returns {Array} Array of week descriptor objects
 *
 * Behaviour:
 *  - 'current'  → Current week + next 3 weeks (always 4 columns)
 *  - 'previous' → Allocation start → current week (inclusive)
 *  - 'upcoming' → Next week → allocation end (current week is EXCLUDED)
 */
export function getViewWeeks(mode, allocationStartDate, allocationEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonday = getMonday(today);

    const startDate = parseDate(allocationStartDate);
    const endDate = parseDate(allocationEndDate);
    const startMonday = startDate ? getMonday(startDate) : null;
    const endMonday = endDate ? getMonday(endDate) : null;

    if (mode === 'current') {
        // Current tab always shows exactly current week + next 3 weeks.
        return getCurrentFourWeeks(currentMonday);
    }

    if (mode === 'previous') {
        // Previous tab: allocation start → current week (read-only in UI).
        if (!startMonday || startMonday > currentMonday) return [];
        return generateWeeksBetween(startMonday, currentMonday);
    }

    if (mode === 'upcoming') {
        // Upcoming tab: start from NEXT week (current week is intentionally hidden).
        const nextMonday = new Date(currentMonday);
        nextMonday.setDate(currentMonday.getDate() + 7);
        if (!endMonday || nextMonday > endMonday) return [];
        return generateWeeksBetween(nextMonday, endMonday);
    }

    // Fallback: default to current four weeks
    return getCurrentFourWeeks(currentMonday);
}
