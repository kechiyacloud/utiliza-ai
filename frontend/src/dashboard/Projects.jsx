import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchProjectsData } from '../api/projectsApi';
import { getAvailabilityFilters } from '../api/availabilityApi';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';

function Projects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedDepartment) {
        filters.department = selectedDepartment;
      }
      const res = await fetchProjectsData(filters);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load projects data", err);
      setError("Failed to load projects. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const filterData = await getAvailabilityFilters();
        if (filterData && filterData.departments) {
          setDepartments(filterData.departments);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchFilters();
  }, []);

  if (loading && !data) {
    return <div className="p-8 flex items-center justify-center text-gray-400 font-medium h-[60vh]">Loading Projects...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 h-[60vh]">
        <div className="text-red-500 text-sm font-semibold bg-red-50 px-6 py-4 rounded-xl border border-red-100">{error}</div>
        <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-bold transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 w-full h-full overflow-y-auto font-technical">
      {/* Overview Section */}
      <ProjectsOverview
        stats={data?.stats}
        activeFilter={activeCardFilter}
        onFilterChange={setActiveCardFilter}
        onProjectAdded={loadData}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        departments={departments}
      />

      {/* Projects List Section */}
      <ProjectList
        projects={data?.projects || []}
        activeCardFilter={activeCardFilter}
        onRefresh={loadData}
      />
    </div>
  );
}

export default Projects;
