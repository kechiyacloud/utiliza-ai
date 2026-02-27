import React, { useEffect, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { fetchDashboardData } from '../api/dashboardApi';
import ExecutiveDashboardCards from './landing-dashboard/ExecutiveDashboardCards';
import ResourceForecastChart from './landing-dashboard/ResourceForecastChart';
import HighAllocationProjects from './landing-dashboard/HighAllocationProjects';
import TopPerformers from './landing-dashboard/TopPerformers';
import ResourceAvailability from './landing-dashboard/ResourceAvailability';
import AddProjectPanel from './projects/AddProjectPanel';
import AddClientModal from './clients/AddClientModal';
import EmployeeMonthCard from './landing-dashboard/EmployeeMonthCard';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interaction States
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchDashboardData();
        setData(res.data);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    // Restore scroll position when loading is complete
    if (!loading) {
      setTimeout(() => {
        let elId = null;
        if (sessionStorage.getItem('returnToTopPerformers') === 'true') {
          elId = 'dashboard-top-performers';
          sessionStorage.removeItem('returnToTopPerformers');
        } else if (sessionStorage.getItem('returnToDashboardCards') === 'true') {
          elId = 'dashboard-cards';
          sessionStorage.removeItem('returnToDashboardCards');
        } else if (sessionStorage.getItem('returnToHighAllocation') === 'true') {
          elId = 'dashboard-high-allocation';
          sessionStorage.removeItem('returnToHighAllocation');
        } else if (sessionStorage.getItem('returnToResourceAvailability') === 'true') {
          elId = 'dashboard-resource-availability';
          sessionStorage.removeItem('returnToResourceAvailability');
        }

        if (elId) {
          const el = document.getElementById(elId);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }
      }, 100);
    }
  }, [loading]);

  const handleAddProject = (project) => {
    console.log("New project from Dashboard:", project);
    // Logic to add project
  };

  const handleAddClient = (client) => {
    console.log("New client from Dashboard:", client);
    // Logic to add client
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center text-gray-400">Loading Dashboard...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto">
      {/* Header with Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Executive Dashboard</h1>
          <p className="text-gray-500">Overview of company performance and resource utilization.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsProjectPanelOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            Add Project
          </button>
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <UserPlus size={18} className="text-gray-500" />
            Add Client
          </button>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="flex gap-6 w-full flex-wrap" id="dashboard-cards">
        <ExecutiveDashboardCards data={data?.executiveCards} />
        <EmployeeMonthCard />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="w-full lg:w-2/3 h-[350px] min-w-0">
          <ResourceForecastChart data={data?.resourceForecast} />
        </div>
        <div className="w-full lg:w-1/3" id="dashboard-high-allocation">
          <HighAllocationProjects projects={data?.highAllocationProjects} />
        </div>
      </div>

      {/* Top Performers Row */}
      <div className="w-full" id="dashboard-top-performers">
        <TopPerformers employees={data?.topPerformers} />
      </div>

      {/* Availability Row */}
      <div className="w-full" id="dashboard-resource-availability">
        <ResourceAvailability availability={data?.resourceAvailability} />
      </div>

      {/* Interaction Components */}
      <AddProjectPanel
        isOpen={isProjectPanelOpen}
        onClose={() => setIsProjectPanelOpen(false)}
        onAdd={handleAddProject}
      />

      <AddClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onAdd={handleAddClient}
      />
    </div>
  )
}

export default Dashboard