// Application-wide constants
export const DEPARTMENTS = [
    'Software Engineering',
    'Data Engineering',
    'Quality Engineering',
    'Cloud Solutions Engineering',
    'SRE',
    'CSE',
    'System Operations',
    'Product Engineering',
    'Security Engineering',
    'US Staffing',
    'Business Development',
    'Training & Development',
    'HR',
    'Finance',
    'PMO',
    'Management'
];

export const LOCATIONS = [
    'USA',
    'Coimbatore',
    'Canada',
    'Malaysia',
    'Chennai'
];

export const STATUS_OPTIONS = [
    'Active',
    'Bench',
    'Notice Period',
    'Allocated',
    'PIP',
    'Resigned',
    'Leadership',
    'Internal Operations',
    'Training'
];

// Statuses that must be manually set by admin (not auto-calculated from allocation)
export const MANUAL_STATUS_OPTIONS = ['Notice period', 'PIP', 'Resigned'];

export const PROJECT_STATUS_OPTIONS = [
    'Not Started',
    'In Progress',
    'On Hold',
    'Completed'
];

export const PROJECT_SUB_STATUS_OPTIONS = [
    { value: 'SOW_SIGNED', label: 'SOW Signed' },
    { value: 'SOW_NOT_SIGNED', label: 'SOW Not Signed' }
];

export const WORK_MODES = [
    'Remote',
    'Hybrid',
    'Onsite'
];

export const EMPLOYMENT_TYPES = [
    'Full Time',
    'Contract',
    'Intern',
    'Consultant'
];
