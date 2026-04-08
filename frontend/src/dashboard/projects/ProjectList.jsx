import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Pencil, Eye, Trash2, AlertTriangle, Loader2, PieChart, ArrowLeft, Download, FileText, Table as TableIcon, FileSpreadsheet, ChevronDown } from 'lucide-react';
import axios from '../../api/axios';
import EditProjectPanel from './EditProjectPanel';
import FilterPanel from './FilterPanel';
import ProjectStatusChart from './ProjectStatusChart';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { PROJECT_SUB_STATUS_OPTIONS } from '../../data/constants';

const ProjectList = ({ projects, activeCardFilter, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeView, setActiveView] = useState('table'); // 'table' or 'chart'
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.search && projects && projects.length > 0) {
            setSearchTerm(location.state.search);
            // Auto open the details panel if we find a direct match
            const foundProj = projects.find(p => p.name.toLowerCase() === location.state.search.toLowerCase());
            if (foundProj) {
                setSelectedProject(foundProj);
            }
            // Clear location state to prevent reopening on subsequent renders or back navigation
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

        // Search Bar logic (Quick searches name/client from top bar)
        const matchesSearchTerm = (project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.client || '').toLowerCase().includes(searchTerm.toLowerCase());

        // Side Panel Filter Logic (AND condition)
        const matchesName = !filters.projectName || (project.name || '').toLowerCase().includes(filters.projectName.toLowerCase());
        
        const matchesResource = !filters.resourceName || (project.resourceNames || '').toLowerCase().includes(filters.resourceName.toLowerCase());

        const isAllStatus = !filters.status || filters.status === 'All Status';
        const statusValue = (project.status || '').trim();
        const statusMatches = isAllStatus || statusValue === filters.status;
        const subStatusFilterActive = filters.status === 'In Progress' && Boolean(filters.sowStatus);
        const subStatusMatches = !subStatusFilterActive || (project.sub_status || project.subStatus || '') === filters.sowStatus;
        const matchesStatus = statusMatches && subStatusMatches;
        
        const matchesResourceType = !filters.resourceType || (project.billable || '').toLowerCase() === filters.resourceType.toLowerCase();

        // Date overlap filter (Start/End)
        const projectStart = new Date(project.startDate || project.start_date);
        const projectEnd = new Date(project.endDate || project.end_date || project.startDate || project.start_date);
        const hasProjectDates = !Number.isNaN(projectStart.getTime());
        const filterStart = filters.startDate ? new Date(filters.startDate) : null;
        const filterEnd = filters.endDate ? new Date(filters.endDate) : null;
        const matchesDate = (() => {
            if (!filterStart && !filterEnd) return true;
            if (!hasProjectDates) return false;
            if (filterStart && projectEnd < filterStart) return false;
            if (filterEnd && projectStart > filterEnd) return false;
            return true;
        })();

        const matchesTime = true;

        // Quick Card Filter logic (Categories)
        let matchesCardFilter = true;
        if (activeCardFilter === 'Internal') {
            matchesCardFilter = ['Internal', 'POC'].includes(project.type);
        } else if (activeCardFilter === 'Client') {
            matchesCardFilter = project.type === 'Client';
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
               matchesResourceType && matchesDate && matchesTime && matchesCardFilter;
    });

    // Compute dynamic table heading
    const tableTitle = (() => {
        if (!activeCardFilter) return 'All Projects';
        if (activeCardFilter === 'Ongoing') return 'Active Projects';
        if (activeCardFilter === 'Client') return 'External Projects';
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full relative min-h-[500px]">

                {/* Header (Tabs and Filter) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 mb-6 gap-4">
                {/* Left Side: Tabs */}
                <div className="flex gap-8">
                    <button
                            onClick={() => setActiveView('table')}
                            className={`text-lg font-bold transition-colors ${activeView === 'table' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tableTitle} <span className="font-normal opacity-70">({filteredProjects.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveView('chart')}
                            className={`text-lg font-bold transition-colors ${activeView === 'chart' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Project Status Chart
                        </button>
                    </div>

                    {/* Right Side: Search and Export */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                            >
                                <Download size={14} />
                                Export
                                <ChevronDown size={12} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isExportMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <button onClick={() => { handleExport('excel'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel (.xlsx)
                                        </button>
                                        <button onClick={() => { handleExport('csv'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                                            <TableIcon size={14} className="text-blue-500" /> CSV (.csv)
                                        </button>
                                        <button onClick={() => { handleExport('pdf'); setIsExportMenuOpen(false); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors border-t border-slate-50">
                                            <FileText size={14} className="text-red-500" /> PDF Document
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {isFilterActive && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition text-gray-700"
                                title="Clear all active filters"
                            >
                                <span className="text-gray-500 text-sm">✕</span>
                                Clear
                            </button>
                        )}
                        <button
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`p-2 rounded-xl border transition-all shadow-sm ${isFilterPanelOpen ? 'bg-blue-50 border-blue-200 text-blue-600 ring-2 ring-blue-50' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'}`}
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {activeView === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="text-left py-4 pl-4">Project Name</th>
                                    <th className="text-center py-4">Status</th>
                                    <th className="text-center py-4">Billable</th>
                                    <th className="text-center py-4">Resources</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project) => (
                                    <tr key={project.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4">
                                            <div
                                                className="flex items-center gap-3 cursor-pointer group"
                                                onClick={() => handleViewClick(project)}
                                                title="View project details"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-100 transition-colors shadow-sm">
                                                    {project.icon || project.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 transition-colors group-hover:text-blue-700">{project.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{project.project_id || project.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span 
                                                className="px-4 py-1.5 rounded-full text-xs font-bold"
                                                style={typeof project.statusPillColor === 'object' ? project.statusPillColor : {
                                                    backgroundColor: project.status === 'Completed' ? '#DBEAFE' : '#DCFCE7',
                                                    color: project.status === 'Completed' ? '#1E40AF' : '#166534'
                                                }}
                                            >
                                                {formatStatus(project)}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span 
                                                className="px-3 py-1 rounded-md text-xs font-bold border"
                                                style={{
                                                    backgroundColor: project.billable === 'Billable' ? '#EDE9FE' : '#F3F4F6',
                                                    color: project.billable === 'Billable' ? '#5B21B6' : '#374151',
                                                    borderColor: project.billable === 'Billable' ? '#DDD6FE' : '#E5E7EB'
                                                }}
                                            >
                                                {project.billable || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-extrabold text-blue-600">{project.resource_count || project.resources || 0}</span>
                                                <span className="text-[10px] text-gray-400 font-medium tracking-tight">Members</span>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(project);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                    title="Edit Project"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProjectToDelete(project);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
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

                {activeView === 'chart' && (
                    <div className="w-full h-[600px] mt-4">
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
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 text-red-600 mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Delete Project</h3>
                        </div>
                        <p className="text-gray-600 mb-6 font-medium">
                            Are you sure you want to delete <span className="font-bold text-gray-900">{projectToDelete.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setProjectToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Deleting...</>
                                ) : (
                                    'Delete'
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
