import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDataRefresh } from '../../context';
import {
    Search, Filter, Pencil, Eye, Trash2, AlertTriangle,
    Loader2, PieChart, ArrowLeft, Download, FileText,
    Table as TableIcon, FileSpreadsheet, ChevronDown,
    LayoutGrid, List, Users, Calendar, ExternalLink,
    MoreVertical, Info
} from 'lucide-react';
import axios from '../../api/axios';
import { clearDashboardCache } from '../../api/dashboardApi';
import EditProjectPanel from './EditProjectPanel';
import FilterPanel from './FilterPanel';
import ProjectStatusChart from './ProjectStatusChart';
import TruncatedText from '../../components/TruncatedText';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import cdBlueLogo from '../../assets/CD-Blue.svg';
import { PROJECT_SUB_STATUS_OPTIONS } from '../../data/constants';

const AvatarCircle = ({ name, avatar_url, size = 'w-6 h-6' }) => {
    return (
        <div className={`${size} rounded-full border border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0 group/avatar relative`} title={name}>
            {avatar_url ? (
                <img
                    src={avatar_url}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                        e.target.parentElement.innerHTML = `<span class="text-[8px] font-bold text-slate-400 font-sans">${name?.[0]?.toUpperCase() || '?'}</span>`;
                    }}
                />
            ) : (
                <span className="text-[8px] font-bold text-slate-400 font-sans">{name?.[0]?.toUpperCase() || '?'}</span>
            )}
        </div>
    );
};

const AvatarStack = ({ resources, totalCount, size = 'w-6 h-6' }) => {
    // Defensively ensure resources is an array and filter out nulls
    const validResources = Array.isArray(resources) ? resources.filter(Boolean) : [];
    if (validResources.length === 0) return null;

    const displayMembers = validResources.slice(0, 3);
    const remainingCount = Math.max((totalCount || validResources.length) - displayMembers.length, 0);

    return (
        <div className="flex -space-x-1.5 overflow-hidden items-center group/stack cursor-pointer">
            {displayMembers.map((user, i) => {
                const avatar = user.avatar_url || user.photo_url || user.profile_image;
                return (
                    <AvatarCircle
                        key={user.id || user.employee_id || i}
                        name={user.name || user.employee_name || 'Unknown'}
                        avatar_url={avatar}
                        size={size}
                    />
                );
            })}
            {remainingCount > 0 && (
                <div className={`${size} rounded-full border border-white bg-blue-50 flex items-center justify-center text-[7px] font-black text-blue-600 shadow-sm z-10 transition-transform group-hover/stack:translate-x-0.5`}>
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

const calculateProjectProgress = (project) => {
    const today = new Date();
    const start = new Date(project.startDate || project.start_date);
    const end = new Date(project.endDate || project.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { pct: 0, daysLeft: 0 };
    const msDay = 1000 * 60 * 60 * 24;
    const totalDuration = Math.max((end - start) / msDay, 1);
    const elapsed = Math.max((today - start) / msDay, 0);
    let pct = Math.round((elapsed / totalDuration) * 100);
    if (today < start) pct = 0;
    if (today > end) pct = 100;
    pct = Math.min(Math.max(pct, 0), 100);
    const daysLeft = Math.max(Math.ceil((end - today) / msDay), 0);
    return { pct, daysLeft };
};

const getProgressColorClasses = (pct) => {
    if (pct <= 30) return 'bg-emerald-500';
    if (pct <= 60) return 'bg-amber-400';
    return 'bg-red-500';
};

const getStatusBadgeStyle = (status, pct) => {
    const s = (status || '').toLowerCase();
    if (s.includes('overdue')) return { backgroundColor: '#FEF2F2', color: '#991B1B' }; // Red
    if (s.includes('ending soon')) return { backgroundColor: '#FFF7ED', color: '#C2410C' }; // Orange
    if (s === 'completed') return { backgroundColor: '#F0FDF4', color: '#166534' }; // Green

    if (pct <= 30) return { backgroundColor: '#DCFCE7', color: '#166534' };
    if (pct <= 60) return { backgroundColor: '#FFFBEB', color: '#B45309' };
    return { backgroundColor: '#FEF2F2', color: '#991B1B' };
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};



const ProjectCard = ({ project, onEdit, onDelete, onView, formatStatus, isSelected, onClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const progress = calculateProjectProgress(project);
    return (
        <div 
            onClick={onClick}
            className={`bg-white border rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out group relative animate-in fade-in zoom-in duration-300 flex flex-col h-full cursor-pointer
                ${isSelected 
                    ? 'border-blue-600 shadow-[0_10px_30px_rgba(37,99,235,0.12)] -translate-y-1 ring-4 ring-blue-50 bg-gradient-to-b from-white to-blue-50/20' 
                    : 'border-slate-100/80 hover:border-blue-500/80 hover:shadow-[0_10px_30px_rgba(37,99,235,0.08)] hover:-translate-y-1 hover:bg-gradient-to-b hover:from-white hover:to-blue-50/10'
                }`}
        >
            {/* Action Buttons - Absolute positioned to avoid title overlap */}
            <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors bg-white/80 backdrop-blur-sm border border-transparent hover:border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100"
                        data-open={isMenuOpen}
                        title="Actions"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}></div>
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(project); }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(project); }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 mb-5 pr-12">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm transition-all duration-300 flex-shrink-0
                    ${isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                    }`}
                >
                    {project.icon || (project.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-bold transition-colors duration-300
                        ${isSelected ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-700'}`}
                    >
                        <TruncatedText text={project.name} maxWidth="100%" />
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                        <TruncatedText text={project.project_id || project.id} maxWidth="100%" />
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-normal text-slate-500">Status</span>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-normal uppercase tracking-wider whitespace-nowrap"
                        style={getStatusBadgeStyle(project.status, progress.pct)}
                    >
                        {formatStatus(project)}
                    </span>
                </div>

                {/* Progress Bar with Avatars */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-600">{progress.pct}%</span>
                            <AvatarStack
                                resources={project.team_members || project.resources || project.allocations || []}
                                totalCount={project.resource_count || (project.team_members || project.resources || []).length || 0}
                                size="w-5 h-5"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressColorClasses(calculateProjectProgress(project).pct)}`}
                                style={{ width: `${calculateProjectProgress(project).pct}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all duration-300
                        ${isSelected 
                            ? 'bg-blue-50/40 border-blue-100/80' 
                            : 'bg-slate-50/80 border-slate-100/50 group-hover:bg-blue-50/30 group-hover:border-blue-100/50'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Users size={12} />
                            <span className="text-sm font-normal uppercase">Team</span>
                        </div>
                        <p className="text-sm font-normal text-gray-700">{project.resource_count || project.resources || 0} Members</p>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all duration-300
                        ${isSelected 
                            ? 'bg-blue-50/40 border-blue-100/80' 
                            : 'bg-slate-50/80 border-slate-100/50 group-hover:bg-blue-50/30 group-hover:border-blue-100/50'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar size={12} />
                            <span className="text-sm font-normal uppercase">Type</span>
                        </div>
                        <p className="text-sm font-normal text-gray-700">{project.type}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 font-normal">
                    <Info size={12} className="text-blue-400" />
                    <span>Client: <span className="font-normal text-gray-700">
                        {(() => {
                            let c = project.client_name || project.client || '—';
                            return (c === 'Internal' || c === 'External') ? '—' : c;
                        })()}
                    </span></span>
                </div>

                {project.skills && project.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {project.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100">
                                {skill}
                            </span>
                        ))}
                        {project.skills.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium ml-1">
                                +{project.skills.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onView(project); }}
                    className={`w-full py-2.5 mt-auto text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border shadow-sm active:scale-[0.98]
                        ${isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-md' 
                            : 'bg-slate-50 text-gray-600 border-slate-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md'
                        }`}
                >
                    View Details
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
};

const ProjectList = ({
    projects,
    activeCardFilter,
    onRefresh,
    allEmployeeNames,
    filters,
    onFilterChange,
    departments = [],
    sortBy,
    onSortChange,
    searchTerm,
    onSearchChange,
    activeView,
    onViewChange,
    activeDepartment = ''
}) => {
    const { triggerRefresh } = useDataRefresh();
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);
    const [selectedCardId, setSelectedCardId] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();

    // Handle filter application by passing to parent
    const handleApplyFilters = (newFilters) => {
        onFilterChange(newFilters);
    };

    const handleClearFilters = () => {
        const cleared = {
            department: '',
            projectName: '',
            status: 'All Status',
            sowStatus: '',
            startDate: '',
            endDate: '',
            resourceName: '',
            resourceType: ''
        };
        onFilterChange(cleared);
    };

    const hasActiveFilters = Object.values(filters || {}).some(v => v !== '' && v !== 'All Status');

    if (!projects || !Array.isArray(projects)) return null;

    const filteredProjects = useMemo(() => {
        const normalizeStatus = (s) => (s || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
        const isCompletedStatus = (s) => {
            const norm = normalizeStatus(s);
            return ['closed', 'completed', 'done', 'ended', 'finished'].some(opt => norm.includes(opt));
        };

        console.log(`[ProjectList] Filtering ${projects.length} projects. searchTerm: "${searchTerm}", activeCardFilter: "${activeCardFilter}", activeDepartment: "${activeDepartment}"`);
        const filtered = projects.filter(project => {
            if (!project || !project.name) {
                console.log(`[ProjectList Filter Fail] Project missing name`, project);
                return false;
            }

            const matchesSearchTerm = (project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.client || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearchTerm) {
                 console.log(`[ProjectList Filter Fail] Search term mismatch for project ${project.name}`);
            }

            // 1. Sidebar Status Filter
            let matchesSidebarStatus = true;
            if (filters?.status && filters.status !== 'All Status') {
                const pStatus = normalizeStatus(project.status || project.project_status);
                const fStatus = normalizeStatus(filters.status);

                if (fStatus === 'in progress') {
                    matchesSidebarStatus = ['live', 'in progress', 'running', 'active', 'ongoing'].some(s => pStatus.includes(s));
                } else if (fStatus === 'completed') {
                    matchesSidebarStatus = ['closed', 'completed', 'done', 'ended', 'finished'].some(s => pStatus.includes(s));
                } else if (fStatus === 'not started') {
                    matchesSidebarStatus = ['not started', 'planned', 'upcoming'].some(s => pStatus.includes(s));
                } else {
                    matchesSidebarStatus = pStatus.includes(fStatus);
                }
                if (!matchesSidebarStatus) {
                    console.log(`[ProjectList Filter Fail] Sidebar Status mismatch for project ${project.name} (pStatus: ${pStatus}, fStatus: ${fStatus})`);
                }
            }

            // 2. Dashboard Card Filter override/combination
            let matchesCardFilter = true;
            const projectStatus = normalizeStatus(project.status || project.project_status);
            if (activeCardFilter === 'Internal') {
                matchesCardFilter = ['internal', 'poc'].includes((project.type || '').toLowerCase());
            } else if (activeCardFilter === 'External') {
                matchesCardFilter = ['external', 'client'].includes((project.type || '').toLowerCase());
            } else if (activeCardFilter === 'Active' || activeCardFilter === 'Ongoing') {
                matchesCardFilter = ['live', 'in progress', 'running', 'active', 'ongoing'].some(s => projectStatus.includes(s));
            } else if (activeCardFilter === 'Overdue') {
                matchesCardFilter = projectStatus.includes('overdue');
            } else if (activeCardFilter === 'Ending Soon') {
                matchesCardFilter = projectStatus.includes('ending soon') && projectStatus !== 'completed';
            } else if (activeCardFilter === 'Partner') {
                matchesCardFilter = (project.type || '').toLowerCase() === 'partner';
            } else if (activeCardFilter === 'Upcoming') {
                const isFutureDate = project.startDate && new Date(project.startDate) > new Date();
                matchesCardFilter = projectStatus === 'not started' || isFutureDate;
            } else if (activeCardFilter === 'Completed') {
                matchesCardFilter = ['closed', 'completed', 'done', 'ended', 'finished'].some(s => projectStatus.includes(s));
            }

            // 3. Additional Sidebar Filters
            let matchesResourceType = true;
            if (filters?.resourceType) {
                matchesResourceType = (project.type || '').toLowerCase() === filters.resourceType.toLowerCase();
            }

            let matchesProjectName = true;
            if (filters?.projectName) {
                matchesProjectName = (project.name || '').toLowerCase().includes(filters.projectName.toLowerCase());
            }

            let matchesResourceName = true;
            if (filters?.resourceName) {
                const rQuery = filters.resourceName.toLowerCase();
                const members = project.team_members || project.resources || [];
                matchesResourceName = members.some(m => (m.name || '').toLowerCase().includes(rQuery));
            }

            let matchesSowStatus = true;
            if (filters?.sowStatus) {
                matchesSowStatus = project.sub_status === filters.sowStatus || project.subStatus === filters.sowStatus;
            }
            // Date filtering uses overlap semantics: project's timeline must intersect
            // the filter window. Applied client-side as a defensive layer in addition
            // to the backend's matching SQL filter, so the list reacts immediately.
            let matchesDateFilter = true;
            const pStartStr = project.startDate || project.start_date;
            const pEndStr = project.endDate || project.end_date;

            if (filters?.startDate && filters?.endDate) {
                if (pStartStr && pEndStr) {
                    const fStart = new Date(filters.startDate);
                    const fEnd = new Date(filters.endDate);
                    const pStart = new Date(pStartStr);
                    const pEnd = new Date(pEndStr);
                    if (!Number.isNaN(fStart.getTime()) && !Number.isNaN(fEnd.getTime()) && !Number.isNaN(pStart.getTime()) && !Number.isNaN(pEnd.getTime())) {
                        matchesDateFilter = pStart >= fStart && pEnd <= fEnd;
                    }
                } else {
                    matchesDateFilter = false;
                }
            } else if (filters?.startDate) {
                if (pStartStr) {
                    const fStart = new Date(filters.startDate);
                    const pStart = new Date(pStartStr);
                    if (!Number.isNaN(fStart.getTime()) && !Number.isNaN(pStart.getTime())) {
                        matchesDateFilter = pStart >= fStart;
                    }
                } else {
                    matchesDateFilter = false;
                }
            } else if (filters?.endDate) {
                if (pEndStr) {
                    const fEnd = new Date(filters.endDate);
                    const pEnd = new Date(pEndStr);
                    if (!Number.isNaN(fEnd.getTime()) && !Number.isNaN(pEnd.getTime())) {
                        matchesDateFilter = pEnd <= fEnd;
                    }
                } else {
                    matchesDateFilter = false;
                }
            }

            // 4. Sort-based Filtering (requested by user)
            let matchesSortFilter = true;
            if (sortBy === 'finishing-soon' || sortBy === 'finishing-last') {
                matchesSortFilter = !isCompletedStatus(project.status || project.project_status);
            } else if (sortBy === 'internal') {
                matchesSortFilter = ['internal', 'poc'].includes((project.type || '').toLowerCase());
            } else if (sortBy === 'billable') {
                const bVal = (project.billable || '').toLowerCase().replace(/[\s-]/g, '');
                matchesSortFilter = ['billable', 'yes', 'true'].includes(bVal);
            } else if (sortBy === 'non-billable') {
                const bVal = (project.billable || '').toLowerCase().replace(/[\s-]/g, '');
                matchesSortFilter = ['nonbillable', 'no', 'false'].includes(bVal);
            }

            return matchesSearchTerm &&
                matchesSidebarStatus &&
                matchesCardFilter &&
                matchesResourceType &&
                matchesProjectName &&
                matchesResourceName &&
                matchesSowStatus &&
                matchesDateFilter &&
                matchesSortFilter;
        });

        // Debug logging for filter verification as requested
        if (filtered.length !== projects.length || hasActiveFilters || searchTerm) {
            console.log(`[ProjectFilter] Total: ${projects.length} | Filtered: ${filtered.length} | Card: ${activeCardFilter || 'None'} | Sidebar Status: ${filters?.status || 'All'}`);
        }

        return filtered.sort((a, b) => {
            // Force finishing-soon sort if Ending Soon filter is applied
            const effectiveSort = activeCardFilter === 'Ending Soon' ? 'finishing-soon' : sortBy;

            if (effectiveSort === 'newest') {
                const dateA = new Date(a.startDate || a.start_date || 0);
                const dateB = new Date(b.startDate || b.start_date || 0);
                return dateB - dateA;
            }
            if (effectiveSort === 'alphabetical') {
                return (a.name || '').localeCompare(b.name || '');
            }
            if (effectiveSort === 'finishing-soon' || effectiveSort === 'finishing-last') {
                const getStatusPriority = (project) => {
                    if (isCompletedStatus(project.status)) return 3;
                    const s = (project.status || '').toLowerCase();
                    if (['not started', 'planned', 'upcoming'].includes(s)) return 2;
                    return 1;
                };

                const priorityA = getStatusPriority(a);
                const priorityB = getStatusPriority(b);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                const dateA = new Date(a.endDate || a.end_date || '9999-12-31').getTime();
                const dateB = new Date(b.endDate || b.end_date || '9999-12-31').getTime();

                if (effectiveSort === 'finishing-soon') {
                    return dateA - dateB;
                } else {
                    return dateB - dateA;
                }
            }
            if (effectiveSort === 'billable' || effectiveSort === 'non-billable' || effectiveSort === 'internal') {
                const dateA = new Date(a.startDate || a.start_date || 0);
                const dateB = new Date(b.startDate || b.start_date || 0);
                return dateB - dateA;
            }
            return 0;
        });
    }, [projects, searchTerm, filters, activeCardFilter, sortBy, activeDepartment]);

    const tableTitle = (() => {
        if (!activeCardFilter) return 'All Projects';
        if (activeCardFilter === 'Ongoing') return 'Active Projects';
        if (activeCardFilter === 'External') return 'External Projects';
        if (activeCardFilter === 'Internal') return 'Internal Projects';
        if (activeCardFilter === 'Partner') return 'Partner Projects';
        if (activeCardFilter === 'Upcoming') return 'Upcoming Projects';
        if (activeCardFilter === 'Completed') return 'Completed Projects';
        return 'All Projects';
    })();

    const handleDeleteConfirm = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/projects/${projectToDelete.uuid || projectToDelete.project_id || projectToDelete.id}`);
            clearDashboardCache(); // Sync dashboard
            triggerRefresh();
            if (onRefresh) onRefresh();
            setProjectToDelete(null);
        } catch (error) {
            console.error("Failed to delete project", error);
            const errorMsg = error.response?.data?.detail || "Failed to delete project. Check console for details.";
            alert(errorMsg);
        } finally {
            setIsDeleting(false);
        }
    };


    const SUB_STATUS_LABELS = PROJECT_SUB_STATUS_OPTIONS.reduce((acc, cur) => {
        acc[cur.value] = cur.label;
        return acc;
    }, {});

    const formatStatus = (project) => {
        const base = project.display_status || project.raw_status || project.status || '';
        if ((project.status || '').toLowerCase() === 'in progress') {
            const sub = project.sub_status || project.subStatus;
            const label = sub ? SUB_STATUS_LABELS[sub] || sub : '';
            if (label) return `${base} / ${label}`;
        }
        return base;
    };


    const handleViewClick = (project) => {
        const identifier = project.uuid || project.project_id || project.id;
        navigate(`/info/projects/${identifier}`, { state: { project } });
    };

    const handleEditClick = (project) => {
        setSelectedProject(project);
        setIsEditFormOpen(true);
    };

    const handleSaveProject = async (payload) => {
        try {
            const identifier = payload.uuid || payload.project_id || payload.id;
            await axios.put(`/projects/${identifier}`, payload);
            clearDashboardCache(); // Sync dashboard
            if (onRefresh) onRefresh();
            // Panel will remain open as requested
        } catch (error) {
            console.error("Failed to update project", error);
            throw error;
        }
    };

    const handleExport = async (format) => {
        const formatDate = (val) => {
            if (!val) return '--';
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                return val.substring(0, 10);
            }
            const date = new Date(val);
            if (isNaN(date.getTime())) return '--';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const exportData = filteredProjects.map(p => ({
            'Project Name': p.name,
            'Type': p.type,
            'Status': formatStatus(p),
            'Billable': p.billable,
            'Resources': p.resource_count || p.resources || 0,
            'Start Date': formatDate(p.start_date || p.startDate),
            'End Date': formatDate(p.end_date || p.endDate)
        }));

        const fileName = `Projects_${tableTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            exportToCSV(exportData, fileName);
        } else if (format === 'excel') {
            exportToExcel(exportData, fileName);
        } else if (format === 'pdf') {
            const columns = [
                { header: 'Project Name', dataKey: 'Project Name' },
                { header: 'Type', dataKey: 'Type' },
                { header: 'Status', dataKey: 'Status' },
                { header: 'Billable', dataKey: 'Billable' },
                { header: 'Resources', dataKey: 'Resources' },
                { header: 'Start Date', dataKey: 'Start Date' },
                { header: 'End Date', dataKey: 'End Date' }
            ];
            const subtitle = `Filter: ${tableTitle}  |  Generated: ${new Date().toLocaleString('en-GB')}`;
            await exportToPDF(exportData, columns, 'Project List', fileName, { subtitle, logoUrl: cdBlueLogo });
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full relative min-h-[600px]">

                {/* Header */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b border-slate-50 pb-6 mb-6 gap-4">
                    {/* Left Side: View Toggles */}
                    <div className="flex items-center gap-5 shrink-0">
                        <button
                            onClick={() => onViewChange('table')}
                            className={`text-sm font-semibold tracking-tight transition-colors ${activeView === 'table' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tableTitle} ({filteredProjects.length})
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200" />

                        <button
                            onClick={() => onViewChange('chart')}
                            className={`text-sm font-semibold tracking-tight transition-colors ${activeView === 'chart' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Project Status Bar
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200" />

                        <button
                            onClick={() => onViewChange('grid')}
                            className={`text-sm font-semibold tracking-tight transition-colors ${activeView === 'grid' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Grid
                        </button>
                    </div>

                    {/* Right Side: Search, Export, Filter, Sort */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Export */}
                        <div className="relative group">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                            >
                                <Download size={14} />
                                Export
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExportMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <button onClick={() => { handleExport('excel'); setIsExportMenuOpen(false); }} className="w-full px-5 py-3 text-left text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors">
                                            <FileSpreadsheet size={16} className="text-emerald-500" /> Excel (.xlsx)
                                        </button>
                                        <button onClick={() => { handleExport('csv'); setIsExportMenuOpen(false); }} className="w-full px-5 py-3 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
                                            <TableIcon size={16} className="text-blue-500" /> CSV (.csv)
                                        </button>
                                        <button onClick={() => { handleExport('pdf'); setIsExportMenuOpen(false); }} className="w-full px-5 py-3 text-left text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 transition-colors border-t border-slate-50">
                                            <FileText size={16} className="text-rose-500" /> PDF Document
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative w-64 md:w-56 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search Project"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold placeholder:text-sm placeholder:font-semibold outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-slate-800 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>

                        {/* Filter */}
                        <button
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${isFilterPanelOpen || hasActiveFilters ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                            <Filter size={18} />
                            {hasActiveFilters && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>

                        {/* Sort */}
                        <div className="relative group">
                            {(() => {
                                const sortOptions = [
                                    { id: 'newest', label: 'Newest First' },
                                    { id: 'alphabetical', label: 'Alphabetical (A → Z)' },
                                    { id: 'billable', label: 'Billable' },
                                    { id: 'non-billable', label: 'Non-Billable' },
                                    { id: 'internal', label: 'Internal' },
                                    { id: 'finishing-soon', label: 'Finishing Soon' },
                                    { id: 'finishing-last', label: 'Finishing Last' },
                                ];
                                const activeSortLabel = sortOptions.find(opt => opt.id === sortBy)?.label || 'Sort';
                                return (
                                    <>
                                        <button
                                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 bg-white border rounded-xl text-sm font-semibold transition-all shadow-sm ${sortBy ? 'border-blue-300 text-blue-600 bg-blue-50/50' : 'border-slate-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {sortBy ? <span>Sort: <span className="font-semibold">{activeSortLabel}</span></span> : 'Sort'}
                                            </span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSortMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)}></div>
                                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    {sortOptions.map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => { onSortChange(opt.id); setIsSortMenuOpen(false); }}
                                                            className={`w-full px-4 py-2.5 text-left text-xs transition-all flex items-center justify-between group
                                                                ${sortBy === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                                                        >
                                                            {opt.label}
                                                            {sortBy === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2.5 text-sm font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all shadow-sm"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Table View */}
                {activeView === 'table' && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-50">
                        <table className="w-full font-sans">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-50">
                                    <th className="text-left py-5 pl-6">Project Details</th>
                                    <th className="text-center py-5">Status</th>
                                    <th className="text-center py-5">Type</th>
                                    <th className="text-center py-5">Resource</th>
                                    <th className="text-center py-5">Start Date</th>
                                    <th className="text-center py-5">End Date</th>
                                    <th className="text-center py-5 px-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project) => (
                                    <tr key={project.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-5 pl-6">
                                            <div
                                                className="flex items-center gap-4 cursor-pointer"
                                                onClick={() => handleViewClick(project)}
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                    {project.icon || project.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0 max-w-[200px] sm:max-w-[250px] lg:max-w-[300px]">
                                                    <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors tracking-tight">
                                                        <TruncatedText text={toTitleCase(project.name)} maxWidth="100%" />
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-sans tracking-tight">
                                                        <TruncatedText text={project.project_id || project.id} maxWidth="100%" />
                                                    </div>
                                                    <div className="text-sm text-slate-500 font-normal mt-0.5">
                                                        Client: {(() => {
                                                            let c = project.client_name || project.client || '—';
                                                            return (c === 'Internal' || c === 'External') ? '—' : c;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center text-xs font-semibold text-slate-600">
                                            {toTitleCase(formatStatus(project))}
                                        </td>
                                        <td className="py-5 text-center">
                                            <span
                                                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-100 bg-slate-50 text-slate-600 font-sans tracking-wide"
                                            >
                                                {toTitleCase(project.type || 'Unknown')}
                                            </span>
                                        </td>

                                        <td className="py-5 text-center align-middle">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-slate-600 font-semibold text-xs">
                                                    {project.resource_count || project.resources || 0}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center align-middle font-medium text-slate-600 text-xs font-mono">
                                            {project.startDate || project.start_date ? (project.startDate || project.start_date).substring(0, 10) : 'TBD'}
                                        </td>
                                        <td className="py-5 text-center align-middle font-medium text-slate-600 text-xs font-mono">
                                            {project.endDate || project.end_date ? (project.endDate || project.end_date).substring(0, 10) : 'TBD'}
                                        </td>
                                        <td className="py-5 px-6 align-middle min-w-[120px]">
                                            <div className="flex justify-center relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(activeActionMenuId === project.id ? null : project.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200 shadow-sm"
                                                    title="Actions"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {activeActionMenuId === project.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); }}></div>
                                                        <div className="absolute right-6 top-10 mt-1 w-36 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); handleEditClick(project); }}
                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveActionMenuId(null); setProjectToDelete(project); }}
                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Grid View */}
                {activeView === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEditClick}
                                onDelete={setProjectToDelete}
                                onView={handleViewClick}
                                formatStatus={formatStatus}
                                isSelected={selectedCardId === project.id}
                                onClick={() => setSelectedCardId(selectedCardId === project.id ? null : project.id)}
                            />
                        ))}
                        {filteredProjects.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="p-4 bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                                    <List size={40} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">
                                    {filters?.department || activeCardFilter ? 'No projects found for this filter' : 'No Projects Found'}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    {filters?.department
                                        ? `No projects found for the selected department. Try a different one or "All Departments".`
                                        : 'Try adjusting your filters or search term'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Chart View */}
                {activeView === 'chart' && (
                    <div className="w-full h-[600px] mt-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                        <ProjectStatusChart projects={filteredProjects} />
                    </div>
                )}
            </div>

            {/* Modals and Side Panels */}
            <EditProjectPanel
                isOpen={isEditFormOpen}
                onClose={() => setIsEditFormOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />

            <FilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                departments={departments}
                currentFilters={{
                    ...filters,
                    allResourceNames: allEmployeeNames && allEmployeeNames.length > 0
                        ? allEmployeeNames.join(', ')
                        : Array.from(new Set(projects.map(p => p.resource_names).filter(Boolean))).join(', ')
                }}
            />

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 text-rose-600 mb-6">
                            <div className="p-4 bg-rose-50 rounded-2xl">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">Delete Project</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Irreversible Action</p>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-8 font-medium border-l-4 border-rose-100 pl-4 py-2">
                            Are you absolutely sure you want to delete <span className="font-black text-slate-900 uppercase tracking-tight break-all">{projectToDelete.name}</span>? This action cannot be undone and all associated data will be lost.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setProjectToDelete(null)}
                                disabled={isDeleting}
                                className="px-6 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <><Loader2 size={14} className="animate-spin" /> Deleting...</>
                                ) : (
                                    'Delete Project'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectList;
