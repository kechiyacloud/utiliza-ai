import React, { useEffect, useState, useCallback } from 'react';
import { fetchProjectsData } from '../api/projectsApi';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';

function Projects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardFilter, setActiveCardFilter] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProjectsData();
      setData(res.data);
    } catch (err) {
      console.error("Failed to load projects data", err);
      setError("Failed to load projects. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-gray-400 font-medium">Loading Projects...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-sm font-semibold bg-red-50 px-6 py-4 rounded-xl border border-red-100">{error}</div>
        <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 font-bold transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto">
      {/* Overview Section */}
      <ProjectsOverview
        stats={data?.stats}
        activeFilter={activeCardFilter}
        onFilterChange={setActiveCardFilter}
        onProjectAdded={loadData}
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
