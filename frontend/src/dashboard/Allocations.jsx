import React, { useState, useEffect } from 'react';
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

function Allocations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    dateRange: 'Jan 2026 - Apr 2026',
    department: 'All Departments',
    resourceType: 'All Resources'
  });

  const [forecastBench, setForecastBench] = useState([]);
  const [selectedEmpForProjects, setSelectedEmpForProjects] = useState(null);
  const [possibleProjects, setPossibleProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Fetch Logic
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [res, benchRes] = await Promise.all([
          fetchAllocationData(filters),
          fetchForecastBench()
        ]);
        setData(res.data);
        setForecastBench(benchRes);
      } catch (error) {
        console.error("Failed to load allocation data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]); // Re-fetch when filters change

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

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-gray-400 font-medium">Loading Resource Data...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto">
      {/* Page Header + Filters on same row */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resource Allocation</h1>
          <p className="text-gray-500 text-sm">Monitor organization-wide utilization and capacity.</p>
        </div>
        <AllocationFilters filters={filters} setFilters={setFilters} />
      </div>

      {/* Metrics Row */}
      <AllocationMetrics metrics={data?.metrics} />

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
          <DepartmentAllocationChart />
        )}
      </div>

      {/* Details Row (Forecast Bench & Project Matches) */}
      <div className="flex flex-col lg:flex-row gap-6 w-full pb-8">
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
  )
}

export default Allocations