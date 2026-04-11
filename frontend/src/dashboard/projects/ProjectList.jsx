import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { PROJECT_SUB_STATUS_OPTIONS } from '../../data/constants';

const ProjectCard = ({ project, onEdit, onDelete, onView, formatStatus }) => {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {project.icon || project.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-1 truncate max-w-[160px] font-sans" title={project.name}>
                            {project.name}
                        </h3>
                        <p className="text-sm text-slate-500 font-sans tracking-tight">
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
                    <span className="text-sm font-normal text-slate-500 font-sans">Status</span>
                    <span 
                        className="px-3 py-1 rounded-full text-xs font-normal uppercase tracking-wider font-sans"
                        style={typeof project.statusPillColor === 'object' ? project.statusPillColor : {
                            backgroundColor: project.status === 'Completed' ? '#DBEAFE' : '#DCFCE7',
                            color: project.status === 'Completed' ? '#1E40AF' : '#166534'
                        }}
                    >
                        {formatStatus(project)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Users size={12} />
                            <span className="text-sm font-normal font-sans uppercase">Team</span>
                        </div>
                        <p className="text-sm font-normal text-gray-700 font-sans">{project.resource_count || 0} Members</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar size={12} />
                            <span className="text-sm font-normal font-sans uppercase">Type</span>
                        </div>
                        <p className="text-sm font-normal text-gray-700 font-sans">{project.type}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500 font-normal font-sans">
                    <Info size={12} className="text-blue-400" />
                    <span>Client: <span className="font-normal text-gray-700">{project.client || '—'}</span></span>
                </div>

                <button 
                    onClick={() => onView(project)}
                    className="w-full py-2.5 mt-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-gray-600 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 hover:border-blue-600 font-sans"
                >
                    View Details
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
};

const ProjectList = ({ projects, activeCardFilter, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeView, setActiveView] = useState('table'); // 'table', 'grid', or 'chart'
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
            matchesCardFilter = project.type === 'External';
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
        const base = project.status || '';
        if (base.toLowerCase() === 'in progress') {
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

    const handleSaveProject = async (updatedProject) => {
        try {
            await axios.put(`/projects/${updatedProject.project_id || updatedProject.id}`, {
                project_name: updatedProject.name,
                project_status: updatedProject.status,
                type: updatedProject.type,
                client: updatedProject.client,
                sub_status: updatedProject.subStatus || updatedProject.sub_status || null,
                billable: updatedProject.billable,
                start_date: updatedProject.startDate || null,
                end_date: updatedProject.endDate || null,
            });
            if (onRefresh) onRefresh();
            setIsEditFormOpen(false);
        } catch (error) {
            console.error("Failed to update project", error);
            throw error;
        }
    };

    const handleExport = (format) => {
        const exportData = filteredProjects.map(p => ({
            'Project Name': p.name,
            'Client/Partner': p.client || '—',
            'Type': p.type,
            'Status': formatStatus(p),
            'Billable': p.billable,
            'Resources': p.resource_count || p.resources || 0,
            'Start Date': p.startDate || p.start_date || '—',
            'End Date': p.endDate || p.end_date || '—'
        }));

        const fileName = `Projects_${tableTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            exportToCSV(exportData, fileName);
        } else if (format === 'excel') {
            exportToExcel(exportData, fileName);
        } else if (format === 'pdf') {
            const columns = [
                { header: 'Project Name', dataKey: 'Project Name' },
                { header: 'Client', dataKey: 'Client/Partner' },
                { header: 'Type', dataKey: 'Type' },
                { header: 'Status', dataKey: 'Status' },
                { header: 'Billable', dataKey: 'Billable' },
                { header: 'Resources', dataKey: 'Resources' },
            ];
            exportToPDF(exportData, columns, `Project List - ${tableTitle}`, fileName);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full relative min-h-[600px]">

                {/* Header (Tabs and Filter) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-50 pb-6 mb-8 gap-6">
                {/* Left Side: View Toggles */}
                <div className="flex items-center p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button
                        onClick={() => setActiveView('table')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold uppercase transition-all font-sans ${activeView === 'table' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                    >
                        <List size={16} />
                        Table
                    </button>
                    <button
                        onClick={() => setActiveView('grid')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                    >
                        <LayoutGrid size={16} />
                        Grid
                    </button>
                    <button
                        onClick={() => setActiveView('chart')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'chart' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                    >
                        <PieChart size={16} />
                        Analytics
                    </button>
                </div>

                {/* Right Side: Search and Export */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group">
                        <button 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold uppercase text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm font-sans"
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

                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all font-normal text-gray-700 placeholder:text-slate-400 font-sans"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button
                        onClick={() => setIsFilterPanelOpen(true)}
                        className={`p-3 rounded-2xl border transition-all shadow-sm flex items-center justify-center ${isFilterPanelOpen || isFilterActive ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                        <Filter size={20} />
                        {isFilterActive && <span className="ml-2 w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                    </button>

                    {isFilterActive && (
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-3 text-[10px] font-normal uppercase tracking-widest bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 tracking-tight flex items-center gap-3 font-sans">
                    {tableTitle}
                    <span className="text-sm font-normal bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase font-sans">
                        {filteredProjects.length} Projects
                    </span>
                </h2>
            </div>

                {activeView === 'table' && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-50">
                        <table className="w-full font-sans">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-50">
                                    <th className="py-5 pl-6">Project Details</th>
                                    <th className="text-center py-5">Status</th>
                                    <th className="text-center py-5">Type</th>
                                    <th className="text-center py-5">Team Size</th>
                                    <th className="w-20 pr-6"></th>
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
                                                    <div className="text-sm text-slate-500 font-normal mt-0.5">Client: {project.client || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <span 
                                                className="px-4 py-1.5 rounded-full text-xs font-normal uppercase tracking-wider font-sans"
                                                style={typeof project.statusPillColor === 'object' ? project.statusPillColor : {
                                                    backgroundColor: project.status === 'Completed' ? '#DBEAFE' : '#DCFCE7',
                                                    color: project.status === 'Completed' ? '#1E40AF' : '#166534'
                                                }}
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
                                            <div className="flex flex-col items-center">
                                                <span className="text-base font-normal text-blue-600 leading-none">{project.resource_count || 0}</span>
                                                <span className="text-sm text-slate-500 font-normal uppercase mt-1 font-sans">Resources</span>
                                            </div>
                                        </td>
                                        <td className="py-5 pr-6">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(project);
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="Edit Project"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProjectToDelete(project);
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Delete Project"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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
