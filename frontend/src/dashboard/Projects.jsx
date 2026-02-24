import React, { useEffect, useState } from 'react';
import { fetchProjectsData } from '../api/projectsApi';
import ProjectsOverview from './projects/ProjectsOverview';
import ProjectList from './projects/ProjectList';

function Projects() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCardFilter, setActiveCardFilter] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchProjectsData();
        setData(res.data);
      } catch (error) {
        console.error("Failed to load projects data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-gray-400">Loading Projects...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto">
      {/* Overview Section */}
      <ProjectsOverview
        stats={data?.stats}
        activeFilter={activeCardFilter}
        onFilterChange={setActiveCardFilter}
      />

      {/* Projects List Section */}
      <ProjectList
        projects={data?.projects}
        activeCardFilter={activeCardFilter}
      />
    </div>
  )
}

export default Projects