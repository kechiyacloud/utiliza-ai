import React, { useEffect, useState, useCallback } from 'react';
import { fetchProjectsData } from '../api/projectsApi';
import axios from '../api/axios';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';

function Projects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  const loadData = useCallback(async (dept = selectedDepartment) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProjectsData(dept);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load projects data", err);
      setError("Failed to load projects. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get('/employees/filter-options');
        if (res.data && res.data.departments) {
          const filtered = res.data.departments.filter(d => d !== 'All' && d !== 'All Departments');
          setDepartments(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    loadData(selectedDepartment);
  }, [selectedDepartment, loadData]);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400 font-medium h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Loading Projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-sm font-normal bg-red-50 px-6 py-4 rounded-xl border border-red-100">{error}</div>
        <button onClick={() => loadData()} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-normal transition-colors shadow-lg shadow-blue-100">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .projects-poppins-container, 
        .projects-poppins-container * {
            font-family: 'Poppins', sans-serif !important;
        }
      `}</style>
      <div className="p-4 flex flex-col gap-4 w-full h-full overflow-y-auto bg-slate-50/50 projects-poppins-container">
        {/* Overview Section */}
      <ProjectsOverview
        stats={data?.stats}
        activeFilter={activeCardFilter}
        onFilterChange={setActiveCardFilter}
        onProjectAdded={() => loadData()}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        departments={departments}
      />

      {/* Projects List Section */}
      <ProjectList
        projects={data?.projects || []}
        activeCardFilter={activeCardFilter}
        onRefresh={() => loadData()}
      />
      </div>
    </>
  );
}

export default Projects;
