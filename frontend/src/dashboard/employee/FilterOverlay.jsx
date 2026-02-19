import React, { useEffect, useState, useMemo } from 'react';
import { X, Filter, ChevronDown, Check } from 'lucide-react';

const Checkbox = ({ checked, onChange, label, count }) => (
    <label className="flex items-center gap-3 cursor-pointer group py-1.5 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
        <div
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all 
            ${checked ? 'bg-[#3BA9FB] border-[#3BA9FB]' : 'border-slate-300 group-hover:border-slate-400'}`}
        >
            {checked && <Check size={10} className="text-white" />}
        </div>
        <span className={`text-sm flex-1 ${checked ? 'text-slate-800 font-semibold' : 'text-slate-600 group-hover:text-slate-800'}`}>
            {label}
        </span>
        <span className="text-xs text-slate-400">({count || 0})</span>
        {/* Hidden native checkbox for accessibility */}
        <input type="checkbox" className="hidden" checked={checked || false} onChange={onChange} />
    </label>
);

const AccordionSection = ({
    title,
    sectionIds,
    items,
    categoryKey,
    countMap,
    searchProps,
    activeSection,
    toggleSection,
    localFilters,
    toggleFilter
}) => {
    const selectedCount = (localFilters[categoryKey] || []).length;
    return (
        <div className="border-b border-slate-100 last:border-0 last:pb-24">
            <button
                onClick={() => toggleSection(sectionIds)}
                className="w-full flex items-center justify-between py-4 text-slate-800 hover:text-[#3BA9FB] transition-colors group"
            >
                <span className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide group-hover:translate-x-1 transition-transform">{title}</span>
                    {selectedCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3BA9FB] text-white text-[10px] font-bold">
                            {selectedCount}
                        </span>
                    )}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${activeSection === sectionIds ? 'rotate-180' : ''}`}
                />
            </button>

            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${activeSection === sectionIds ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                {/* Search Input for Skills */}
                {searchProps && (
                    <div className="mb-3 px-1">
                        <input
                            type="text"
                            value={searchProps.value}
                            onChange={searchProps.onChange}
                            placeholder={searchProps.placeholder}
                            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3BA9FB] focus:ring-1 focus:ring-[#3BA9FB]/20 transition-all placeholder:text-slate-400"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {items.length > 0 ? (
                        items.map(item => (
                            <Checkbox
                                key={item}
                                label={item}
                                count={countMap[item]}
                                checked={localFilters[categoryKey]?.includes(item)}
                                onChange={() => toggleFilter(categoryKey, item)}
                            />
                        ))
                    ) : (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No results found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const FilterOverlay = ({ isOpen, onClose, filters, onFilterChange, employees }) => {
    // Local State for the Drawer
    const [localFilters, setLocalFilters] = useState(filters || {
        departments: [],
        types: [],
        skills: [],
        locations: [],
        statusTags: []
    });

    // Accordion State - Mutually Exclusive
    const [activeSection, setActiveSection] = useState('departments');

    // Dynamic Master Skills Logic
    const [skillSearch, setSkillSearch] = useState("");

    const availableSkills = useMemo(() => {
        // Debugging logs
        console.log("FilterOverlay Debug: Departments:", localFilters.departments);
        console.log("FilterOverlay Debug: Skill Search Term:", skillSearch);

        // 1. Filter employees by selected departments (if any)
        const relevantEmployees = localFilters.departments.length > 0
            ? employees.filter(emp => localFilters.departments.includes(emp.department))
            : employees;

        console.log("FilterOverlay Debug: Relevant Employees Count:", relevantEmployees.length);

        // 2. Extract unique skills from relevant employees
        const skillsSet = new Set();
        relevantEmployees.forEach(emp => {
            if (emp.skills && Array.isArray(emp.skills)) {
                emp.skills.forEach(skill => skillsSet.add(skill));
            }
        });

        // 3. Convert to array and sort
        let skills = Array.from(skillsSet).sort();
        console.log("FilterOverlay Debug: All Skills Found:", skills);

        // 4. Filter by search query
        if (skillSearch) {
            skills = skills.filter(skill => skill.toLowerCase().includes(skillSearch.toLowerCase()));
        }
        console.log("FilterOverlay Debug: Filtered Skills:", skills);

        return skills;
    }, [employees, localFilters.departments, skillSearch]);

    const toggleSection = (section) => {
        setActiveSection(prev => prev === section ? '' : section);
    };

    // Helper: derive tag label — must be defined before the useMemos that call it
    const getTagLabel = (status, billable) => {
        const s = (status || '').toLowerCase();
        const b = (billable || '').toLowerCase();
        if (s === 'notice period') return 'Serving Notice';
        if (s === 'bench' && b === 'billable') return 'Shadow Billing';
        if (s === 'bench') return 'Bench';
        if (s === 'allocated' && b === 'non-billable') return 'Non-Billable';
        return 'Active Billable';
    };

    // Calculate Total Result Count for Apply button — useMemo for instant update
    const headerCount = useMemo(() => {
        return employees.filter(emp => {
            const matchesDept = !localFilters.departments.length || localFilters.departments.includes(emp.department);
            const matchesType = !localFilters.types.length || localFilters.types.includes(emp.employeeType);
            const matchesLocation = !localFilters.locations.length || localFilters.locations.includes(emp.location);
            const matchesSkills = !localFilters.skills.length || (emp.skills && localFilters.skills.some(s => emp.skills.includes(s)));
            const matchesStatusTag = !localFilters.statusTags?.length || localFilters.statusTags.includes(getTagLabel(emp.employee_status, emp.billable));
            return matchesDept && matchesType && matchesLocation && matchesSkills && matchesStatusTag;
        }).length;
    }, [localFilters, employees]);

    // Derived Counts based on LOCAL filters
    const counts = useMemo(() => {
        const getCountsFor = (field, isArray = false) => {
            return employees.filter(emp => {
                const matchesDept = field === 'department' || !localFilters.departments.length || localFilters.departments.includes(emp.department);
                const matchesType = field === 'employeeType' || !localFilters.types.length || localFilters.types.includes(emp.employeeType);
                const matchesLocation = field === 'location' || !localFilters.locations.length || localFilters.locations.includes(emp.location);
                const matchesSkills = field === 'skills' || !localFilters.skills.length || (emp.skills && localFilters.skills.some(s => emp.skills.includes(s)));

                return matchesDept && matchesType && matchesLocation && matchesSkills;
            }).reduce((acc, emp) => {
                const value = emp[field];
                if (isArray && Array.isArray(value)) {
                    value.forEach(v => acc[v] = (acc[v] || 0) + 1);
                } else if (value) {
                    acc[value] = (acc[value] || 0) + 1;
                }
                return acc;
            }, {});
        };

        return {
            departments: getCountsFor('department'),
            types: getCountsFor('employeeType'),
            locations: getCountsFor('location'),
            skills: getCountsFor('skills', true),
            statusTags: employees.filter(emp => {
                // Cross-filter: respect all OTHER active filters except statusTags itself
                const matchesDept = !localFilters.departments.length || localFilters.departments.includes(emp.department);
                const matchesType = !localFilters.types.length || localFilters.types.includes(emp.employeeType);
                const matchesLocation = !localFilters.locations.length || localFilters.locations.includes(emp.location);
                const matchesSkills = !localFilters.skills.length || (emp.skills && localFilters.skills.some(s => emp.skills.includes(s)));
                return matchesDept && matchesType && matchesLocation && matchesSkills;
            }).reduce((acc, emp) => {
                const label = getTagLabel(emp.employee_status, emp.billable);
                acc[label] = (acc[label] || 0) + 1;
                return acc;
            }, {})
        };
    }, [localFilters, employees]);

    // ── DEBUG LOGS (console testing) ──────────────────────────────────────────
    useMemo(() => {
        console.groupCollapsed('%c FilterOverlay Debug ', 'background:#3BA9FB;color:#fff;font-weight:bold;border-radius:4px;padding:2px 6px');
        console.log('Active Filters:', localFilters);
        console.log('Filtered Result Count:', headerCount, '/', employees.length, 'employees');
        console.log('Departments:', Object.entries(counts.departments).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
        console.log('Employee Types:', Object.entries(counts.types).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
        console.log('Locations:', Object.entries(counts.locations).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
        console.log('Status Tags:', Object.entries(counts.statusTags).map(([k, v]) => `${k}(${v})`).join(', ') || 'none');
        console.log('Skills:', Object.keys(counts.skills).sort().join(', ') || 'none');
        console.groupEnd();
    }, [localFilters, counts, headerCount]);
    // ─────────────────────────────────────────────────────────────────────────


    // Sync localFilters from parent whenever drawer opens (ensures fresh state on open)
    useEffect(() => {
        if (isOpen && filters) {
            setLocalFilters(filters);
        }
    }, [isOpen]);

    const handleClose = () => {
        // Discard uncommitted changes — reset to last applied state
        if (filters) setLocalFilters(filters);
        onClose();
    };

    const toggleFilter = (category, value) => {
        setLocalFilters(prev => {
            const current = prev[category] || [];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [category]: updated };
        });
    };

    const handleApplyFilters = () => {
        onFilterChange(localFilters);
        onClose();
    };

    const handleClearAll = () => {
        const empty = {
            departments: [],
            types: [],
            skills: [],
            locations: [],
            statusTags: []
        };
        setLocalFilters(empty);
        setSkillSearch("");
    };

    // Filter Lists
    const DEPARTMENT_LIST = [
        'Software Engineering', 'Data Engineering', 'Quality Engineering',
        'Cloud Solutions Engineering', 'System Operations', 'Product Engineering',
        'Security Engineering', 'US Staffing', 'Business Development',
        'Training & Development', 'HR', 'Finance', 'PMO', 'Management'
    ];

    const EMPLOYEE_TYPES = ['Full Time', 'Contract', 'Intern', 'Consultant'];

    const LOCATIONS = [
        'USA', 'India - Coimbatore', 'Canada', 'Malaysia', 'India - Chennai'
    ];

    const STATUS_TAGS = [
        'Active Billable',
        'Non-Billable',
        'Bench',
        'Shadow Billing',
        'Serving Notice'
    ];


    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={handleClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" />

            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Filter size={18} className="text-[#3BA9FB]" />
                        <h2 className="text-lg font-bold">Filters</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClearAll}
                            className="text-xs font-medium text-slate-500 hover:text-[#3BA9FB] transition-colors"
                        >
                            Clear All
                        </button>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 h-[calc(100%-80px)] overflow-y-auto p-5 custom-scrollbar relative">

                    <AccordionSection
                        title="DEPARTMENT"
                        sectionIds="departments"
                        items={DEPARTMENT_LIST}
                        categoryKey="departments"
                        countMap={counts.departments}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                    />

                    <AccordionSection
                        title="EMPLOYEE TYPE"
                        sectionIds="types"
                        items={EMPLOYEE_TYPES}
                        categoryKey="types"
                        countMap={counts.types}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                    />

                    <AccordionSection
                        title="MASTER SKILLS"
                        sectionIds="skills"
                        items={availableSkills}
                        categoryKey="skills"
                        countMap={counts.skills}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                        searchProps={{
                            value: skillSearch,
                            onChange: (e) => setSkillSearch(e.target.value),
                            placeholder: "Search skills..."
                        }}
                    />

                    <AccordionSection
                        title="LOCATION"
                        sectionIds="locations"
                        items={LOCATIONS}
                        categoryKey="locations"
                        countMap={counts.locations}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                    />

                    <AccordionSection
                        title="STATUS"
                        sectionIds="statusTags"
                        items={STATUS_TAGS}
                        categoryKey="statusTags"
                        countMap={counts.statusTags}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                    />

                    {/* Padding at bottom to avoid overlap with fixed footer */}
                    <div className="h-24"></div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 w-full p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleApplyFilters}
                        className="w-full py-3 bg-[#3BA9FB] hover:bg-[#2563EB] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        Apply Filters
                        {headerCount > 0 && (
                            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                {headerCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default FilterOverlay;
