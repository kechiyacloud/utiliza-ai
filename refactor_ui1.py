import os

filepath = r'c:\Users\KechiyaVadivel\Desktop\Test-file\cd-utiliza-ai\frontend\src\dashboard\projects\ProjectDetailsPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. New helpers for dynamic week rendering
new_helpers = """
// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function fmtDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildWeekDescriptor(mondayDate) {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6);
    const today = new Date();
    today.setHours(0,0,0,0);
    const currMonday = getMonday(today);
    
    const isPast = mondayDate < currMonday;
    const isCurrent = mondayDate.getTime() === currMonday.getTime();
    const isFuture = mondayDate > currMonday;

    const wkNum = getISOWeekNumber(mondayDate);
    const yr = mondayDate.getFullYear();
    const yearWeek = `${yr}-${wkNum}`;

    let label = isCurrent ? "This Week" : (isPast ? `Week ${wkNum}` : `Week ${wkNum}`);
    
    return { label, dateRange: `${fmtDate(mondayDate)} – ${fmtDate(sunday)}`, yearWeek, isPast, isCurrent, isFuture, year: yr, weekNum: wkNum, monday: new Date(mondayDate), sunday: new Date(sunday) };
}

function getViewWeeks(mode, startStr, endStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currMonday = getMonday(today);

    let startMonday, endMonday;

    if (mode === 'previous') {
        if (!startStr) return [];
        const pStart = new Date(startStr);
        pStart.setHours(0,0,0,0);
        startMonday = getMonday(pStart);
        endMonday = new Date(currMonday);
        endMonday.setDate(currMonday.getDate() - 7);
        if (startMonday > endMonday) return [];
    } else if (mode === 'next') {
        if (!endStr) return [];
        const pEnd = new Date(endStr);
        pEnd.setHours(0,0,0,0);
        startMonday = new Date(currMonday);
        startMonday.setDate(currMonday.getDate() + 7);
        endMonday = getMonday(pEnd);
        if (startMonday > endMonday) return [];
    } else {
        startMonday = new Date(currMonday);
        endMonday = new Date(currMonday);
        endMonday.setDate(currMonday.getDate() + 21); // +3 weeks
    }

    const weeks = [];
    let cur = new Date(startMonday);
    while (cur <= endMonday && weeks.length < 300) {
        weeks.push(buildWeekDescriptor(cur));
        cur.setDate(cur.getDate() + 7);
    }
    return weeks;
}

const WEEK_DEFAULT_HOURS = 40;
const UTILIZATION_FILTERS = [
    { key: 'fully', label: 'Fully Utilized', range: '75-100%', color: 'blue', title: 'Resources using 75% to 100% of weekly capacity.' },
    { key: 'optimal', label: 'Optimally Utilized', range: '40-75%', color: 'indigo', title: 'Resources using 40% to 75% of weekly capacity.' },
    { key: 'under', label: 'Under Utilized', range: '<40%', color: 'amber', title: 'Resources using less than 40% of weekly capacity.' },
    { key: 'over', label: 'Over Allocated', range: '>100%', color: 'rose', title: 'Resources using more than 100% of weekly capacity.' },
];

function stripLeadingZeros(val) {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val);
    if (str === '') return '';
    return str.replace(/^0+(\d)/, '$1');
}

function allocPctToHours(pct) {
    const hours = Math.round((Number(pct) * WEEK_DEFAULT_HOURS) / 100);
    return Math.min(WEEK_DEFAULT_HOURS, Math.max(0, hours));
}

function normalizeAllocationRow(row = {}) {
    const normalized = { weekly_hours: {}, ...row };
    if (!normalized.weekly_hours) normalized.weekly_hours = {};
    return normalized;
}

function getAllocationCategory(percentage) {
    const pct = Number(percentage) || 0;
    if (pct > 100) return 'over';
    if (pct >= 75) return 'fully';
    if (pct >= 40) return 'optimal';
    return 'under';
}

function getResourceAllocationPct(row, visibleWeeks = []) {
    if (row?.allocation_pct !== undefined && row?.allocation_pct !== null && row?.allocation_pct !== '') {
        return Number(row.allocation_pct) || 0;
    }
    if (!visibleWeeks || visibleWeeks.length === 0) return 0;
    const totalHours = visibleWeeks.reduce((sum, wk) => sum + Number((row.weekly_hours || {})[wk.yearWeek] || 0), 0);
    const maxCapacity = WEEK_DEFAULT_HOURS * visibleWeeks.length;
    if (maxCapacity <= 0) return 0;
    return Math.round((totalHours / maxCapacity) * 100);
}
"""

# Replace lines 9 to 124 basically
import re
text = re.sub(r'// ─── Helpers ───.*?function getResourceAllocationPct\(row\) \{.*?\n\}', new_helpers, text, flags=re.DOTALL)


# 2. AllocationTable - viewMode state
table_start = "const AllocationTable = ({ projectId, rows, employees, rolesList, onUpdate, onClearAll, activeUtilizationFilters = [], onResetFilters }) => {"
table_start_new = "const AllocationTable = ({ projectId, projectStart, projectEnd, rows, employees, rolesList, onUpdate, onClearAll, activeUtilizationFilters = [], onResetFilters }) => {\n    const [viewMode, setViewMode] = useState('current'); // 'previous', 'current', 'next'\n    const visibleWeeks = useMemo(() => getViewWeeks(viewMode, projectStart, projectEnd), [viewMode, projectStart, projectEnd]);"
text = text.replace("const AllocationTable = ({ projectId, rows, employees, rolesList, onUpdate, onClearAll, activeUtilizationFilters = [], onResetFilters }) => {", table_start_new)


# 3. getResourceAllocationPct calls
text = text.replace("getResourceAllocationPct(row)", "getResourceAllocationPct(row, visibleWeeks)")


# 4. handleRowChange
old_row_change = """        if (field === 'allocation_pct') {
            // Allow empty string while typing
            if (value === '') {
                currentRow.allocation_pct = '';
            } else {
                const cleaned = stripLeadingZeros(value);
                const pct = Math.min(100, Math.max(0, Number(cleaned) || 0));
                currentRow.allocation_pct = pct;
                // Auto-calc all weekly hours from the new pct
                const hrs = allocPctToHours(pct);
                WEEK_KEYS.forEach((k) => { currentRow[k] = hrs; });
            }
        } else if (W_KEYS.includes(field)) {
            // Allow empty string during active editing (backspace)
            if (value === '') {
                currentRow[field] = '';
            } else {
                const cleaned = stripLeadingZeros(String(value));
                const parsed = Number(cleaned);
                const clamped = Number.isFinite(parsed) ? Math.min(WEEK_DEFAULT_HOURS, Math.max(0, parsed)) : 0;
                currentRow[field] = clamped;
            }
            // Re-compute allocation_pct from hours
            const totalHours = WEEK_KEYS.reduce((sum, k) => sum + Number(currentRow[k] || 0), 0);
            const maxCapacity = WEEK_DEFAULT_HOURS * WEEK_KEYS.length;
            currentRow.allocation_pct = maxCapacity > 0 ? Math.round((totalHours / maxCapacity) * 100) : 0;
        } else {"""

new_row_change = """        if (field === 'allocation_pct') {
            if (value === '') {
                currentRow.allocation_pct = '';
            } else {
                const cleaned = stripLeadingZeros(value);
                const pct = Math.min(100, Math.max(0, Number(cleaned) || 0));
                currentRow.allocation_pct = pct;
                const hrs = allocPctToHours(pct);
                if (!currentRow.weekly_hours) currentRow.weekly_hours = {};
                visibleWeeks.forEach(wk => { currentRow.weekly_hours[wk.yearWeek] = hrs; });
            }
        } else if (field.startsWith('week_')) {
            const yearWeek = field.replace('week_', '');
            if (!currentRow.weekly_hours) currentRow.weekly_hours = {};
            
            if (value === '') {
                currentRow.weekly_hours[yearWeek] = '';
            } else {
                const cleaned = stripLeadingZeros(String(value));
                const parsed = Number(cleaned);
                const clamped = Number.isFinite(parsed) ? Math.min(WEEK_DEFAULT_HOURS, Math.max(0, parsed)) : 0;
                currentRow.weekly_hours[yearWeek] = clamped;
            }
            const totalHours = visibleWeeks.reduce((sum, wk) => sum + Number(currentRow.weekly_hours[wk.yearWeek] || 0), 0);
            const maxCapacity = WEEK_DEFAULT_HOURS * visibleWeeks.length;
            currentRow.allocation_pct = maxCapacity > 0 ? Math.round((totalHours / maxCapacity) * 100) : 0;
        } else {"""

text = text.replace(old_row_change, new_row_change)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print("Saved UI script part 1")
