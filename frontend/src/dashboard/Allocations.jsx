import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import ImportAllocationModal from './allocation/ImportAllocationModal';
import AllocationMetrics from './allocation/AllocationMetrics';
import ProjectUtilization from './allocation/ProjectUtilization';
import ProjectEmployeeAllocation from './allocation/ProjectEmployeeAllocation';
import DepartmentAllocationChart from './allocation/DepartmentAllocationChart';
import DepartmentUtilization from './allocation/DepartmentUtilization';

import EmployeeAllocationList from './allocation/EmployeeAllocationList';
import AllocationFilters from './allocation/AllocationFilters';
import ForecastBenchList from './allocation/ForecastBenchList';
import PossibleProjectMatches from './allocation/PossibleProjectMatches';
import { fetchAllocationData, fetchForecastBench, fetchPossibleProjects } from '../api/allocationApi';
import { useDataRefresh } from '../context';
import ModuleLoader from '../components/ModuleLoader';

function Allocations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshKey } = useDataRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    department: location.state?.departmentFilter 
        ? (location.state.departmentFilter.includes(',') ? location.state.departmentFilter.split(',') : [location.state.departmentFilter])
        : [],
    location: 'All Locations',
    resourceType: 'All Resources'
  });

  const [forecastBench, setForecastBench] = useState([]);
  const [selectedEmpForProjects, setSelectedEmpForProjects] = useState(null);
  const [possibleProjects, setPossibleProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const contextLabel = filters.department && filters.department.length > 0 ? 'Team' : 'Organization';


  // Fetch Logic
  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      setLoading(true);
      try {
        const [res, benchRes] = await Promise.all([
          fetchAllocationData(filters),
          fetchForecastBench(filters.department, filters.location)
        ]);
        if (controller.signal.aborted) return;
        setData(res.data);
        setForecastBench(benchRes);
        setLoading(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load allocation data", error);
          setLoading(false);
        }
      }
    };
    loadData();
    return () => controller.abort();
  }, [filters, refreshKey]); // Re-fetch when filters or global refresh key changes

  // Handle URL Hash Scrolling
  useEffect(() => {
    if (!loading && location.hash === '#forecast-bench') {
      setTimeout(() => {
        const el = document.getElementById('forecast-bench');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [loading, location.hash]);

  const handleEmployeeClick = async (employee) => {
    setSelectedProject(null); // Clear project selection if any
    setSelectedEmpForProjects(employee);
    setLoadingProjects(true);
    try {
      const projects = await fetchPossibleProjects(employee.employee_id);
      setPossibleProjects(projects);
    } catch (error) {
      console.error("Failed to load possible projects", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedEmpForProjects(null); // Clear employee selection if any
    setSelectedProject(project);
  };

  const handleOverallocatedClick = () => {
    navigate('/employees/list', { state: { cardFilter: 'overallocated' } });
  };

  const showForecastOnly = location.state?.showForecastOnly;
  const showUtilizationOnly = location.state?.showUtilizationOnly;

  if (loading) {
    return <ModuleLoader label="Loading Allocations" />;
  }

  if (showForecastOnly) {
    return (
      <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto bg-slate-50">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{contextLabel} Forecast Bench</h1>
            <p className="text-sm font-medium text-gray-500">See which team members will be available soon.</p>
          </div>
        </div>
        <div id="forecast-bench" className="flex flex-col lg:flex-row gap-6 w-full pb-8">
          <div className={`transition-all duration-300 ${selectedEmpForProjects ? 'w-full lg:w-2/3' : 'w-full'}`}>
            <ForecastBenchList
              employees={forecastBench}
              onEmployeeClick={handleEmployeeClick}
            />
          </div>

          {selectedEmpForProjects && (
            <div className="w-full lg:w-1/3 animate-in fade-in slide-in-from-right-4 duration-300">
              <PossibleProjectMatches
                employee={selectedEmpForProjects}
                projects={possibleProjects}
                loading={loadingProjects}
                onClose={() => setSelectedEmpForProjects(null)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showUtilizationOnly) {
    return (
      <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto bg-slate-50">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{contextLabel} Utilization</h1>
            <p className="text-sm font-medium text-gray-500">Check how your team's time is being spent.</p>
          </div>
        </div>

        {/* Filters and Metrics */}
        <div className="flex justify-end w-full">
          <AllocationFilters filters={filters} setFilters={setFilters} />
        </div>
        <AllocationMetrics metrics={data?.metrics} highlightTag={location.state?.showOverAllocation ? 'overallocated' : null} onOverallocatedClick={handleOverallocatedClick} />

        <div className="flex flex-col lg:flex-row gap-6 w-full pb-8">
          <ProjectUtilization
            projects={data?.projects}
            onProjectClick={handleProjectClick}
          />
          {selectedProject ? (
            <ProjectEmployeeAllocation
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          ) : (
            <DepartmentAllocationChart filters={filters} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto">
      {/* Page Header + Filters on same row */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Resource Allocation</h1>
            <p className="text-sm font-medium text-gray-500">See who is busy working and who is free for new projects.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group/soon overflow-hidden rounded-xl">
            <button
              className="flex items-center gap-2 bg-slate-100 text-slate-400 text-sm font-bold px-5 py-2.5 rounded-xl cursor-not-allowed"
            >
              <Upload size={15} strokeWidth={2.5} />
              Import Allocations
            </button>
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] cursor-not-allowed" />

          </div>

          <AllocationFilters filters={filters} setFilters={setFilters} />
        </div>
      </div>

      {/* Metrics Row */}
      <AllocationMetrics metrics={data?.metrics} highlightTag={location.state?.showOverAllocation ? 'overallocated' : null} />

      {/* Utilization Row (Projects & Organization Chart / Employee Allocation) */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <ProjectUtilization
          projects={data?.projects}
          onProjectClick={handleProjectClick}
        />
        {selectedProject ? (
          <ProjectEmployeeAllocation
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        ) : (
          <DepartmentAllocationChart filters={filters} />
        )}
      </div>

      {/* Details Row (Forecast Bench & Project Matches) */}
      <div id="forecast-bench" className="flex flex-col lg:flex-row gap-6 w-full pb-8">
        <div className={`transition-all duration-300 ${selectedEmpForProjects ? 'w-full lg:w-2/3' : 'w-full'}`}>
          <ForecastBenchList
            employees={forecastBench}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>

        {selectedEmpForProjects && (
          <div className="w-full lg:w-1/3 animate-in fade-in slide-in-from-right-4 duration-300">
            <PossibleProjectMatches
              employee={selectedEmpForProjects}
              projects={possibleProjects}
              loading={loadingProjects}
              onClose={() => setSelectedEmpForProjects(null)}
            />
          </div>
        )}
      </div>

      {showImportModal && (
        <ImportAllocationModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => setFilters(f => ({ ...f }))}
        />
      )}
    </div>
  );
}

export default Allocations;
