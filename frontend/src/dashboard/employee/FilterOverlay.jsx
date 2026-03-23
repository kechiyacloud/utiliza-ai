import React, { useEffect, useState, useMemo } from 'react';
import { X, Filter, ChevronDown, Check, Users, Briefcase, Hourglass, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { getEmployeeTag } from '../../components/EmployeeStatusTag';
import { normalizeSkillName } from '../../utils/skillTopics';

const Checkbox = ({ checked, onChange, label, count }) => (
    <label className={`flex items-center gap-3 cursor-pointer group border-b border-slate-50 last:border-0 transition-colors ${checked ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
        <div className="pl-3 flex items-center">
            <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0
                ${checked ? 'bg-[#3BA9FB] border-[#3BA9FB]' : 'border-slate-300 group-hover:border-slate-400'}`}
            >
                {checked && <Check size={10} className="text-white" />}
            </div>
        </div>
        <span className={`text-[13px] flex-1 py-2.5 ${checked ? 'text-slate-800 font-semibold' : 'text-slate-600'}`}>
            {label}
        </span>
        <span className={`pr-4 text-xs font-bold tabular-nums ${checked ? 'text-blue-500' : 'text-slate-400'}`}>
            {count || 0}
        </span>
        <input type="checkbox" className="hidden" checked={checked || false} onChange={onChange} />
    </label>
);

const AccordionSection = ({
    title, sectionIds, items, categoryKey, countMap, searchProps,
    activeSection, toggleSection, localFilters, toggleFilter
}) => {
    const selectedCount = (localFilters[categoryKey] || []).length;
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button
                onClick={() => toggleSection(sectionIds)}
                className="w-full flex items-center justify-between py-3 px-1 text-slate-800 hover:text-[#3BA9FB] transition-colors group"
            >
                <span className="flex items-center gap-2">
                    <span className="font-bold text-[11px] tracking-widest uppercase text-slate-500 group-hover:text-[#3BA9FB] transition-colors">{title}</span>
                    {selectedCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3BA9FB] text-white text-[10px] font-bold">
                            {selectedCount}
                        </span>
                    )}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${activeSection === sectionIds ? 'rotate-180' : ''}`}
                />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${activeSection === sectionIds ? 'max-h-[500px] opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
                {searchProps && (
                    <div className="mb-2 px-1">
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
                <div className="rounded-lg border border-slate-100 overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar">
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
                        <p className="text-xs text-slate-400 italic py-3 text-center">No results found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Stats summary that shows live breakdown of filtered employees
const FilterStats = ({ employees, localFilters, getTagLabel, designations }) => {
    const employeeHasMatchingSkill = (employeeSkills = [], selectedSkills = []) => {
        if (!selectedSkills.length) return true;

        const normalizedEmployeeSkills = new Set(
            (employeeSkills || []).map((skill) => normalizeSkillName(skill).toLowerCase()).filter(Boolean)
        );

        return selectedSkills.some((skill) => normalizedEmployeeSkills.has(normalizeSkillName(skill).toLowerCase()));
    };

    const group = useMemo(() => employees.filter(emp => {
        const matchesDept = !localFilters.departments?.length || localFilters.departments.includes(emp.department);
        const matchesType = !localFilters.types?.length || localFilters.types.includes(emp.employee_type);
        const matchesLocation = !localFilters.locations?.length || localFilters.locations.includes(emp.location);
        const matchesSkills = employeeHasMatchingSkill(emp.skills, localFilters.skills || []);
        const matchesStatusTag = !localFilters.statusTags?.length || localFilters.statusTags.includes(getTagLabel(emp.employee_status));
        const matchesDesig = !localFilters.designations?.length || localFilters.designations.includes(emp.role_designation);
        return matchesDept && matchesType && matchesLocation && matchesSkills && matchesStatusTag && matchesDesig;
    }), [employees, localFilters]);

    const bench = group.filter(e => (e.employee_status || '').toLowerCase() === 'bench').length;
    const notice = group.filter(e => (e.employee_status || '').toLowerCase().includes('notice')).length;
    const allocated = group.filter(e => (e.employee_status || '').toLowerCase().includes('allocated')).length;
    const billable = group.filter(e => e.billable === 'billable').length;
    const avgAlloc = group.length ? Math.round(group.reduce((s, e) => s + (e.employee_allocations || 0), 0) / group.length) : 0;

    if (group.length === 0) return null;

    const stats = [
        { label: 'Total', value: group.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
        { label: 'Allocated', value: allocated, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
        { label: 'Bench', value: bench, color: 'text-orange-500', bg: 'bg-orange-50', icon: Briefcase },
        { label: 'Notice', value: notice, color: 'text-red-500', bg: 'bg-red-50', icon: Hourglass },
        { label: 'Billable', value: billable, color: 'text-violet-600', bg: 'bg-violet-50', icon: DollarSign },
        { label: 'Avg Alloc', value: `${avgAlloc}%`, color: 'text-teal-600', bg: 'bg-teal-50', icon: AlertCircle },
    ];

    return (
        <div className="mx-5 mb-4 p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Preview ({group.length} matching)</p>
            <div className="grid grid-cols-3 gap-1.5">
                {stats.map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${bg}`}>
                        <Icon size={11} className={color} />
                        <div>
                            <p className="text-[9px] text-slate-500">{label}</p>
                            <p className={`text-xs font-extrabold ${color}`}>{value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FilterOverlay = ({ isOpen, onClose, filters, onFilterChange, employees }) => {
    const [localFilters, setLocalFilters] = useState(filters || {
        departments: [],
        types: [],
        skills: [],
        locations: [],
        statusTags: [],
        designations: []
    });

    const [activeSection, setActiveSection] = useState('designations');
    const [skillSearch, setSkillSearch] = useState("");
    const [designationSearch, setDesignationSearch] = useState("");
    const getTagLabel = (status) => getEmployeeTag(status).label;

    const filterOptions = useMemo(() => ({
        departments: [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort(),
        locations: [...new Set(employees.map(emp => emp.location).filter(Boolean))].sort(),
        skills: [...new Set(employees.flatMap(emp => Array.isArray(emp.skills) ? emp.skills.map(normalizeSkillName) : []).filter(Boolean))].sort(),
        employee_types: [...new Set(employees.map(emp => emp.employee_type).filter(Boolean))].sort(),
        status_tags: [...new Set(employees.map(emp => getTagLabel(emp.employee_status)).filter(Boolean))].sort()
    }), [employees]);

    // Derive unique designations from employees
    const allDesignations = useMemo(() =>
        [...new Set(employees.map(e => e.role_designation).filter(Boolean))].sort()
        , [employees]);

    const availableDesignations = useMemo(() =>
        designationSearch
            ? allDesignations.filter(d => d.toLowerCase().includes(designationSearch.toLowerCase()))
            : allDesignations
        , [allDesignations, designationSearch]);

    const availableSkills = useMemo(() => {
        let skills = filterOptions.skills || [];
        if (skillSearch) skills = skills.filter(skill => skill.toLowerCase().includes(skillSearch.toLowerCase()));
        return skills;
    }, [filterOptions.skills, skillSearch]);

    const toggleSection = (section) => {
        setActiveSection(prev => prev === section ? '' : section);
    };

    const headerCount = useMemo(() => {
        return employees.filter(emp => {
            const matchesDept = !localFilters.departments.length || localFilters.departments.includes(emp.department);
            const matchesType = !localFilters.types.length || localFilters.types.includes(emp.employee_type);
            const matchesLocation = !localFilters.locations.length || localFilters.locations.includes(emp.location);
            const matchesSkills = employeeHasMatchingSkill(emp.skills, localFilters.skills || []);
            const matchesStatusTag = !localFilters.statusTags?.length || localFilters.statusTags.includes(getTagLabel(emp.employee_status));
            const matchesDesig = !localFilters.designations?.length || localFilters.designations.includes(emp.role_designation);
            return matchesDept && matchesType && matchesLocation && matchesSkills && matchesStatusTag && matchesDesig;
        }).length;
    }, [localFilters, employees]);

    const counts = useMemo(() => {
        const getCountsFor = (field, isArray = false) => {
            return employees.filter(emp => {
                const matchesDept = field === 'department' || !localFilters.departments.length || localFilters.departments.includes(emp.department);
                const matchesType = field === 'employee_type' || !localFilters.types.length || localFilters.types.includes(emp.employee_type);
                const matchesLocation = field === 'location' || !localFilters.locations.length || localFilters.locations.includes(emp.location);
                const matchesSkills = field === 'skills' || employeeHasMatchingSkill(emp.skills, localFilters.skills || []);
                const matchesDesig = field === 'role_designation' || !localFilters.designations?.length || localFilters.designations.includes(emp.role_designation);
                return matchesDept && matchesType && matchesLocation && matchesSkills && matchesDesig;
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
            designations: getCountsFor('role_designation'),
            departments: getCountsFor('department'),
            types: getCountsFor('employee_type'),
            locations: getCountsFor('location'),
            skills: getCountsFor('skills', true),
            statusTags: employees.filter(emp => {
                const matchesDept = !localFilters.departments.length || localFilters.departments.includes(emp.department);
                const matchesType = !localFilters.types.length || localFilters.types.includes(emp.employee_type);
                const matchesLocation = !localFilters.locations.length || localFilters.locations.includes(emp.location);
                const matchesSkills = employeeHasMatchingSkill(emp.skills, localFilters.skills || []);
                const matchesDesig = !localFilters.designations?.length || localFilters.designations.includes(emp.role_designation);
                return matchesDept && matchesType && matchesLocation && matchesSkills && matchesDesig;
            }).reduce((acc, emp) => {
                const label = getTagLabel(emp.employee_status);
                acc[label] = (acc[label] || 0) + 1;
                return acc;
            }, {})
        };
    }, [localFilters, employees]);

    useEffect(() => {
        if (isOpen && filters) {
            setLocalFilters({ designations: [], ...filters });
        }
    }, [isOpen]);

    const handleClose = () => {
        if (filters) setLocalFilters({ designations: [], ...filters });
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
        const empty = { departments: [], types: [], skills: [], locations: [], statusTags: [], designations: [] };
        setLocalFilters(empty);
        setSkillSearch("");
        setDesignationSearch("");
    };

    const totalActiveFilters = Object.values(localFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    const EMPLOYEE_TYPES = filterOptions.employee_types;
    const LOCATIONS = filterOptions.locations;
    const STATUS_TAGS = filterOptions.status_tags;

    if (!isOpen) return null;

    return (
        <>
            <div onClick={handleClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" />

            <div className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Filter size={18} className="text-[#3BA9FB]" />
                        <h2 className="text-lg font-bold">Filters</h2>
                        {totalActiveFilters > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3BA9FB] text-white text-[10px] font-bold">
                                {totalActiveFilters}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClearAll}
                            className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
                        >
                            Clear All
                        </button>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Live Stats Preview */}
                <div className="flex-shrink-0 pt-3">
                    <FilterStats
                        employees={employees}
                        localFilters={localFilters}
                        getTagLabel={getTagLabel}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">

                    {/* DESIGNATION / ROLE */}
                    <AccordionSection
                        title="ROLE / DESIGNATION"
                        sectionIds="designations"
                        items={availableDesignations}
                        categoryKey="designations"
                        countMap={counts.designations}
                        activeSection={activeSection}
                        toggleSection={toggleSection}
                        localFilters={localFilters}
                        toggleFilter={toggleFilter}
                        searchProps={{
                            value: designationSearch,
                            onChange: (e) => setDesignationSearch(e.target.value),
                            placeholder: "Search designation..."
                        }}
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

                    <div className="h-24"></div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 w-full p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    {totalActiveFilters > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="w-full mb-2 py-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-100 transition-all"
                        >
                            Clear All ({totalActiveFilters} filter{totalActiveFilters > 1 ? 's' : ''})
                        </button>
                    )}
                    <button
                        onClick={handleApplyFilters}
                        className="w-full py-3 bg-[#3BA9FB] hover:bg-[#2563EB] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        Apply Filters
                        {headerCount > 0 && (
                            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                                {headerCount} employees
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default FilterOverlay;
    const employeeHasMatchingSkill = (employeeSkills = [], selectedSkills = []) => {
        if (!selectedSkills.length) return true;

        const normalizedEmployeeSkills = new Set(
            (employeeSkills || []).map((skill) => normalizeSkillName(skill).toLowerCase()).filter(Boolean)
        );

        return selectedSkills.some((skill) => normalizedEmployeeSkills.has(normalizeSkillName(skill).toLowerCase()));
    };
