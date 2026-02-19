import React, { useState } from 'react';
import { Search, Filter, Pencil, Smartphone } from 'lucide-react';
import EditProjectPanel from './EditProjectPanel';
import FilterPanel from './FilterPanel';

const ProjectList = ({ projects }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

    // Filter States
    const [filters, setFilters] = useState({
        name: '',
        type: '',
        status: '',
        minResources: '',
        startDate: '',
        endDate: ''
    });

    if (!projects) return null;

    const filteredProjects = projects.filter(project => {
        // Search Bar logic (Quick search)
        const matchesSearchTerm = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client.toLowerCase().includes(searchTerm.toLowerCase());

        // Panel Filter logic
        const matchesNameFilter = filters.name ? project.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
        const matchesType = filters.type ? project.type === filters.type : true;
        const matchesStatus = filters.status ? project.status === filters.status : true;
        const matchesResources = filters.minResources ? project.resources >= parseInt(filters.minResources) : true;

        // Date filtering could be added here if project data had date objects, skipping for string dates in mock
        // Example:
        // const projectEndDate = new Date(project.endDate);
        // const filterStartDate = filters.startDate ? new Date(filters.startDate) : null;
        // const filterEndDate = filters.endDate ? new Date(filters.endDate) : null;
        // const matchesStartDate = filterStartDate ? projectEndDate >= filterStartDate : true;
        // const matchesEndDate = filterEndDate ? projectEndDate <= filterEndDate : true;

        return matchesSearchTerm && matchesNameFilter && matchesType && matchesStatus && matchesResources;
    });

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const handleEditClick = (project) => {
        setSelectedProject(project);
        setIsEditPanelOpen(true);
    };

    const handleSaveProject = (updatedProject) => {
        console.log("Project Updated:", updatedProject);
        // Update logic would go here
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">All Projects <span className="text-gray-400 font-normal">({projects.length})</span></h3>

                <div className="flex gap-3 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setIsFilterPanelOpen(true)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${isFilterPanelOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter size={16} />
                        Filter
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                            <th className="text-left py-4 pl-4">Project Name</th>
                            <th className="text-left py-4">Client Name</th>
                            <th className="text-left py-4">End Date</th>
                            <th className="text-left py-4">Type</th>
                            <th className="text-center py-4">Status</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProjects.map((project) => (
                            <tr key={project.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                            {project.icon}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{project.name}</div>
                                            {/* Removed health check as requested */}
                                            <div className="text-xs text-gray-500 mt-0.5">{project.resources} resources</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 text-gray-600 font-medium">{project.client}</td>
                                <td className="py-4 text-gray-500 text-sm font-mono">{project.endDate}</td>
                                <td className="py-4">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200">
                                        {project.type}
                                    </span>
                                </td>
                                <td className="py-4 text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${project.statusPillColor}`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="py-4 pr-4 text-right">
                                    <button
                                        onClick={() => handleEditClick(project)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Panel */}
            <EditProjectPanel
                isOpen={isEditPanelOpen}
                onClose={() => setIsEditPanelOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />

            {/* Filter Panel */}
            <FilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                onApplyFilters={handleApplyFilters}
            />
        </div>
    );
};

export default ProjectList;
