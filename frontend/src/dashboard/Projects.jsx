import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchProjectsData, fetchProjectDepartments } from '../api/projectsApi';
import axios from '../api/axios';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';

function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardFilter, setActiveCardFilter] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filters, setFilters] = useState({
      department: '',
      projectName: '',
      status: 'All Status',
      sowStatus: '',
      startDate: '',
      endDate: '',
      resourceName: '',
      resourceType: ''
  });
  const [departments, setDepartments] = useState([]);
  const [allEmployeeNames, setAllEmployeeNames] = useState([]);

  const loadData = useCallback(async (dept = selectedDepartment, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      // filters.department (from FilterPanel) takes precedence over the dept param (from dashboard cards)
      const effectiveDept = currentFilters.department || dept;
      const res = await fetchProjectsData({ 
          department: (effectiveDept === 'All Department' || effectiveDept === 'All Departments') ? '' : effectiveDept, 
          ...currentFilters 
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load projects data", err);
      setError("Failed to load projects. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, filters]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [filterRes, deptRes] = await Promise.allSettled([
          axios.get('/employees/filter-options'),
          fetchProjectDepartments(),
        ]);
        if (filterRes.status === 'fulfilled' && filterRes.value.data) {
          if (filterRes.value.data.employee_names) {
            setAllEmployeeNames(filterRes.value.data.employee_names);
          }
        }
        if (deptRes.status === 'fulfilled') {
          setDepartments(deptRes.value || []);
        }
      } catch (err) {
        console.error("Failed to fetch filter options", err);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    loadData(selectedDepartment);
  }, [selectedDepartment, loadData]);

  // Handle successful project creation - Clear filters to ensure new project visibility
  useEffect(() => {
    if (location.state?.projectAdded) {
      const defaultFilters = {
        projectName: '',
        status: 'All Status',
        sowStatus: '',
        startDate: '',
        endDate: '',
        resourceName: '',
        resourceType: ''
      };
      
      // Reset all UI filter states
      setActiveCardFilter(null);
      setFilters(defaultFilters);
      
      // Force reload data with no filters
      loadData(selectedDepartment, defaultFilters);
      
      // Clean up navigation state to prevent infinite reset loop
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, loadData, selectedDepartment]);

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
      <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">Backend Connection Error</h3>
          <p className="text-gray-500 max-w-sm text-sm">
            We couldn't reach the projects API. Please ensure the backend server and its matching containers are running.
          </p>
        </div>
        <div className="text-red-500 text-xs font-medium bg-red-50/50 px-4 py-2 rounded-lg border border-red-100/50 max-w-md truncate">
          {error}
        </div>
        <button 
          onClick={() => loadData()} 
          className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          Retry Connection
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
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

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
          onRefresh={() => loadData(selectedDepartment, filters)}
          allEmployeeNames={allEmployeeNames}
          filters={filters}
          departments={departments}
          onFilterChange={(newFilters) => {
              setFilters(newFilters);
              // department filter from FilterPanel overrides selectedDepartment for API call
              loadData(newFilters.department || selectedDepartment, newFilters);
          }}
        />
      </div>
    </>
  );
}

export default Projects;