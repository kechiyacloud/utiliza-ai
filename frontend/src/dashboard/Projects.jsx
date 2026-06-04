import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchProjectsData, fetchProjectDepartments } from '../api/projectsApi';
import axios from '../api/axios';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';
import ModuleLoader from '../components/ModuleLoader';

function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derived state from URL params - Source of Truth
  const activeCardFilter = searchParams.get('card') || null;
  const selectedDepartment = searchParams.get('dept') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const searchTerm = searchParams.get('search') || '';
  const activeView = searchParams.get('view') || 'table';

  const filters = {
    department: searchParams.get('dept') || '',
    projectName: searchParams.get('f_name') || '',
    status: searchParams.get('f_status') || 'All Status',
    sowStatus: searchParams.get('f_sow') || '',
    startDate: searchParams.get('f_start') || '',
    endDate: searchParams.get('f_end') || '',
    resourceName: searchParams.get('f_res_name') || '',
    resourceType: searchParams.get('f_res_type') || ''
  };

  const [departments, setDepartments] = useState([]);
  const [allEmployeeNames, setAllEmployeeNames] = useState([]);

  // Helper to update URL params
  const updateParams = useCallback((updates) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === 'All Status') {
          p.delete(k);
        } else {
          p.set(k, v);
        }
      });
      // Handle defaults to keep URL clean
      if (p.get('sort') === 'newest') p.delete('sort');
      if (p.get('view') === 'table') p.delete('view');
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const loadData = useCallback(async (dept = selectedDepartment, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[ProjectsView] loadData called. dept arg: "${dept}", selectedDepartment state: "${selectedDepartment}"`);
      const effectiveDept = currentFilters.department || dept;
      console.log(`[ProjectsView] Fetching for effectiveDept: "${effectiveDept}"`);
      
      const res = await fetchProjectsData({
        ...currentFilters,
        department: (effectiveDept === 'All Department' || effectiveDept === 'All Departments') ? '' : effectiveDept
      });
      console.log(`[ProjectsView] Data received: ${res.data?.projects?.length} projects`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load projects data", err);
      setError("Failed to load data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, filters.department, filters.projectName, filters.status, filters.sowStatus, filters.startDate, filters.endDate, filters.resourceName, filters.resourceType]);

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
          console.log(`[ProjectsView] Fetched ${deptRes.value?.length} departments`);
          setDepartments(deptRes.value || []);
        }
      } catch (err) {
        console.error("Failed to fetch filter options", err);
      }
    };
    fetchOptions();
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle successful project creation - Clear filters to ensure new project visibility
  useEffect(() => {
    if (location.state?.projectAdded) {
      setSearchParams(new URLSearchParams(), { replace: true });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, setSearchParams]);

  if (loading && !data) {
    return <ModuleLoader label="Loading Projects" />;
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

        {/* Overview Section */}
        <ProjectsOverview
          stats={data?.stats}
          activeFilter={activeCardFilter}
          onFilterChange={(val) => updateParams({ card: val })}
          onProjectAdded={() => loadData()}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={(val) => updateParams({ dept: val })}
          departments={departments}
        />

        {/* Projects List Section */}
        <ProjectList
          projects={data?.projects || []}
          activeCardFilter={activeCardFilter}
          onRefresh={() => loadData()}
          allEmployeeNames={allEmployeeNames}
          filters={filters}
          departments={departments}
          activeDepartment={selectedDepartment}
          onFilterChange={(newFilters) => {
            updateParams({
              dept: newFilters.department,
              f_name: newFilters.projectName,
              f_status: newFilters.status,
              f_sow: newFilters.sowStatus,
              f_start: newFilters.startDate,
              f_end: newFilters.endDate,
              f_res_name: newFilters.resourceName,
              f_res_type: newFilters.resourceType
            });
          }}
          sortBy={sortBy}
          onSortChange={(val) => updateParams({ sort: val })}
          searchTerm={searchTerm}
          onSearchChange={(val) => updateParams({ search: val })}
          activeView={activeView}
          onViewChange={(val) => updateParams({ view: val })}
        />
      </div>
    </>
  );
}

export default Projects;
