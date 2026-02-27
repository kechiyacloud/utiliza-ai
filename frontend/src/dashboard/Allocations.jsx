import React, { useState, useEffect } from 'react';
import AllocationMetrics from './allocation/AllocationMetrics';
import ProjectUtilization from './allocation/ProjectUtilization';
import ProjectEmployeeAllocation from './allocation/ProjectEmployeeAllocation';
import DepartmentAllocationChart from './allocation/DepartmentAllocationChart';
import DepartmentUtilization from './allocation/DepartmentUtilization';

import EmployeeAllocationList from './allocation/EmployeeAllocationList';
import AllocationFilters from './allocation/AllocationFilters';
import { fetchAllocationData } from '../api/allocationApi';

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

  // Fetch Logic
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchAllocationData(filters);
        setData(res.data);
      } catch (error) {
        console.error("Failed to load allocation data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]); // Re-fetch when filters change

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
          onProjectClick={(project) => setSelectedProject(project)}
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

      {/* Details Row (Department List & Employee Table) */}
      <div className="flex flex-col lg:flex-row gap-6 w-full pb-8">
        <DepartmentUtilization departments={data?.departments} />
        <EmployeeAllocationList employees={data?.employees} />
      </div>

    </div>
  )
}

export default Allocations