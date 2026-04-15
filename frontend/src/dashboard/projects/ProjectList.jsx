import React, { useState, useEffect } from 'react';
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
import EditProjectPanel from './EditProjectPanel';
import FilterPanel from './FilterPanel';
import ProjectStatusChart from './ProjectStatusChart';
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

const getStatusBadgeStyle = (pct) => {
    if (pct <= 30) return { backgroundColor: '#DCFCE7', color: '#166534' };
    if (pct <= 60) return { backgroundColor: '#FFFBEB', color: '#B45309' };
    return { backgroundColor: '#FEF2F2', color: '#991B1B' };
};


const ProjectCard = ({ project, onEdit, onDelete, onView, formatStatus }) => {
    const progress = calculateProjectProgress(project);
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {project.icon || project.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-1 truncate max-w-[160px]" title={project.name}>
                            {project.name}
                        </h3>
                        <p className="text-sm text-slate-500 tracking-tight">
                            {project.project_id || project.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(project)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(project)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-normal text-slate-500">Status</span>
                    <span
                        className="px-3 py-1 rounded-full text-xs font-normal uppercase tracking-wider whitespace-nowrap"
                        style={getStatusBadgeStyle(progress.pct)}
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
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Users size={12} />
                            <span className="text-sm font-normal uppercase">Team</span>
                        </div>
                        <p className="text-sm font-normal text-gray-700">{project.resource_count || project.resources || 0} Members</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
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

                <button
                    onClick={() => onView(project)}
                    className="w-full py-2.5 mt-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-gray-600 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 hover:border-blue-600"
                >
                    View Details
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
};

const ProjectList = ({ projects, activeCardFilter, onRefresh }) => {
    const { triggerRefresh } = useDataRefresh();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeView, setActiveView] = useState('table');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.search && projects && projects.length > 0) {
            setSearchTerm(location.state.search);
            const foundProj = projects.find(p => p.name.toLowerCase() === location.state.search.toLowerCase());
            if (foundProj) {
                setSelectedProject(foundProj);
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, projects, navigate]);

    // Filter States
    const initialFilters = {
        projectName: '',
        status: 'All Status',
        sowStatus: '',
        startDate: '',
        endDate: '',
        resourceName: '',
        resourceType: ''
    };

    const [filters, setFilters] = useState(initialFilters);

    if (!projects || !Array.isArray(projects)) return null;

    const filteredProjects = projects.filter(project => {
        if (!project || !project.name) return false;

        const matchesSearchTerm = (project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.client || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesName = !filters.projectName || (project.name || '').toLowerCase().includes(filters.projectName.toLowerCase());
        const matchesResource = !filters.resourceName || (project.resourceNames || '').toLowerCase().includes(filters.resourceName.toLowerCase());

        const isAllStatus = !filters.status || filters.status === 'All Status';
        const statusValue = (project.status || '').trim();
        const statusMatches = isAllStatus || statusValue === filters.status;
        const subStatusFilterActive = filters.status === 'In Progress' && Boolean(filters.sowStatus);
        const subStatusMatches = !subStatusFilterActive || (project.sub_status || project.subStatus || '') === filters.sowStatus;
        const matchesStatus = statusMatches && subStatusMatches;

        const matchesResourceType = !filters.resourceType || (project.billable || '').toLowerCase() === filters.resourceType.toLowerCase();

        const projectStart = new Date(project.startDate || project.start_date);
        const projectEnd = new Date(project.endDate || project.end_date || project.startDate || project.start_date);
        const hasProjectDates = !Number.isNaN(projectStart.getTime());
        const filterStart = filters.startDate ? new Date(filters.startDate) : null;
        const filterEnd = filters.endDate ? new Date(filters.endDate) : null;
        const matchesDate = (() => {
            if (!filterStart && !filterEnd) return true;
            if (!hasProjectDates) return false;
            if (filterStart && projectEnd < filterStart) return false;
            if (filterEnd && projectStart > filterStart) return false;
            return true;
        })();

        let matchesCardFilter = true;
        if (activeCardFilter === 'Internal') {
            matchesCardFilter = ['Internal', 'POC'].includes(project.type);
        } else if (activeCardFilter === 'External') {
            matchesCardFilter = ['External', 'Client'].includes(project.type);
        } else if (activeCardFilter === 'Ongoing') {
            matchesCardFilter = ['live', 'in progress', 'running', 'active'].includes((project.status || '').toLowerCase());
        } else if (activeCardFilter === 'Partner') {
            matchesCardFilter = project.type === 'Partner';
        } else if (activeCardFilter === 'Upcoming') {
            const isFutureDate = project.startDate && new Date(project.startDate) > new Date();
            matchesCardFilter = (project.status || '').toLowerCase() === 'not started' || isFutureDate;
        } else if (activeCardFilter === 'Completed') {
            matchesCardFilter = ['closed', 'completed', 'done', 'ended', 'end', 'finished'].includes((project.status || '').toLowerCase());
        }

        return matchesSearchTerm && matchesName && matchesResource && matchesStatus &&
            matchesResourceType && matchesDate && matchesCardFilter;
    }).sort((a, b) => {
        if (sortBy === 'newest') {
            const dateA = new Date(a.startDate || a.start_date || 0);
            const dateB = new Date(b.startDate || b.start_date || 0);
            return dateB - dateA;
        }
        if (sortBy === 'alphabetical') {
            return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'finishing-soon') {
            const dateA = new Date(a.endDate || a.end_date || '9999-12-31').getTime();
            const dateB = new Date(b.endDate || b.end_date || '9999-12-31').getTime();
            return dateA - dateB;
        }
        if (sortBy === 'finishing-last') {
            const dateA = new Date(a.endDate || a.end_date || 0).getTime();
            const dateB = new Date(b.endDate || b.end_date || 0).getTime();
            return dateB - dateA;
        }
        if (sortBy === 'billable') {
            const aVal = a.billable === true || a.is_billable === true || (typeof (a.billable || a.is_billable) === 'string' && (a.billable || a.is_billable).toLowerCase() === 'billable') ? 0 : 1;
            const bVal = b.billable === true || b.is_billable === true || (typeof (b.billable || b.is_billable) === 'string' && (b.billable || b.is_billable).toLowerCase() === 'billable') ? 0 : 1;
            return aVal - bVal;
        }
        if (sortBy === 'non-billable') {
            const aVal = a.billable === false || a.is_billable === false || (typeof (a.billable || a.is_billable) === 'string' && (a.billable || a.is_billable).toLowerCase() === 'non-billable') ? 0 : 1;
            const bVal = b.billable === false || b.is_billable === false || (typeof (b.billable || b.is_billable) === 'string' && (b.billable || b.is_billable).toLowerCase() === 'non-billable') ? 0 : 1;
            return aVal - bVal;
        }
        if (sortBy === 'internal') {
            const aVal = (a.type || '').toLowerCase() === 'internal' ? 0 : 1;
            const bVal = (b.type || '').toLowerCase() === 'internal' ? 0 : 1;
            return aVal - bVal;
        }
        return 0;
    });

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
            await axios.delete(`/projects/${projectToDelete.project_id || projectToDelete.id}`);
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

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
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

    const isFilterActive = Boolean(
        filters.projectName ||
        (filters.status && filters.status !== 'All Status') ||
        filters.sowStatus ||
        filters.startDate ||
        filters.endDate ||
        filters.resourceName ||
        filters.resourceType
    );

    const handleViewClick = (project) => {
        navigate(`/info/projects/${project.id}`, { state: { project } });
    };

    const handleEditClick = (project) => {
        setSelectedProject(project);
        setIsEditFormOpen(true);
    };

    const handleSaveProject = async (payload) => {
        try {
            await axios.put(`/projects/${payload.project_id || payload.id}`, payload);
            if (onRefresh) onRefresh();
            setIsEditFormOpen(false);
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
                            onClick={() => setActiveView('table')}
                            className={`text-sm font-medium tracking-tight transition-colors ${activeView === 'table' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tableTitle} ({filteredProjects.length})
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200" />

                        <button
                            onClick={() => setActiveView('chart')}
                            className={`text-sm font-medium tracking-tight transition-colors ${activeView === 'chart' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Project Status Bar
                        </button>

                        <div className="w-[1px] h-6 bg-slate-200" />

                        <button
                            onClick={() => setActiveView('grid')}
                            className={`text-sm font-medium tracking-tight transition-colors ${activeView === 'grid' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
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
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
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
                                placeholder="Search projects..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all text-gray-700 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter */}
                        <button
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${isFilterPanelOpen || isFilterActive ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-100' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                            <Filter size={18} />
                            {isFilterActive && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>

                        {/* Sort */}
                        <div className="relative group">
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                            >
                                Sort
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSortMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {[
                                            { id: 'newest', label: 'Newest First' },
                                            { id: 'alphabetical', label: 'Alphabetical (A → Z)' },
                                            { id: 'billable', label: 'Billable' },
                                            { id: 'non-billable', label: 'Non-Billable' },
                                            { id: 'internal', label: 'Internal' },
                                            { id: 'finishing-soon', label: 'Finishing Soon' },
                                            { id: 'finishing-last', label: 'Finishing Last' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => { setSortBy(opt.id); setIsSortMenuOpen(false); }}
                                                className={`w-full px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors ${sortBy === opt.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {opt.label}
                                                {sortBy === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reset */}
                        {isFilterActive && (
                            <button
                                onClick={handleClearFilters}
                                className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all"
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
                                    <th className="text-center py-5">Billable</th>
                                    <th className="text-center py-5">Resource</th>
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
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{project.name}</div>
                                                    <div className="text-sm text-slate-500 font-sans tracking-tight">{project.project_id || project.id}</div>
                                                    <div className="text-sm text-slate-500 font-normal mt-0.5">
                                                        Client: {(() => {
                                                            let c = project.client_name || project.client || '—';
                                                            return (c === 'Internal' || c === 'External') ? '—' : c;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <span
                                                className="px-4 py-1.5 rounded-full text-xs font-normal uppercase tracking-wider font-sans whitespace-nowrap"
                                                style={getStatusBadgeStyle(calculateProjectProgress(project).pct)}
                                            >
                                                {formatStatus(project)}
                                            </span>
                                        </td>
                                        <td className="py-5 text-center">
                                            <span
                                                className="px-3 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wider border border-slate-100 bg-slate-50 text-slate-600 font-sans"
                                            >
                                                {project.type || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-5 text-center">
                                            {(() => {
                                                const val = project.billable || project.is_billable;
                                                const isBll = val === true || val === 'true' || (typeof val === 'string' && val.toLowerCase() === 'billable');
                                                const isNonBll = val === false || val === 'false' || (typeof val === 'string' && val.toLowerCase() === 'non-billable');

                                                if (isBll) {
                                                    return (
                                                        <span className="px-3 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wider border border-emerald-100 bg-emerald-50 text-emerald-600 font-sans">
                                                            Billable
                                                        </span>
                                                    );
                                                } else if (isNonBll) {
                                                    return (
                                                        <span className="px-3 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wider border border-amber-100 bg-amber-50 text-amber-600 font-sans">
                                                            Non-Billable
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="px-3 py-1.5 rounded-xl text-xs font-normal uppercase tracking-wider border border-slate-100 bg-slate-50 text-slate-500 font-sans">
                                                        N/A
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-5 text-center align-middle">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-slate-800 font-bold text-lg">
                                                    {project.resource_count || project.resources || 0}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 align-middle min-w-[120px]">
                                            <div className="flex items-center w-full">
                                                <div className="flex-1 flex justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(project);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit Project"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setProjectToDelete(project);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete Project"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
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
                            />
                        ))}
                        {filteredProjects.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="p-4 bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                                    <List size={40} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">No Projects Found</h3>
                                <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search term</p>
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
                currentFilters={filters}
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
                            Are you absolutely sure you want to delete <span className="font-black text-slate-900 uppercase tracking-tight">{projectToDelete.name}</span>? This action cannot be undone and all associated data will be lost.
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
