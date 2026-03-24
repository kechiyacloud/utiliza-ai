import React, { useState, useEffect } from 'react';
import { Plus, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClientKPIs from './clients/ClientKPIs';
import ClientList from './clients/ClientList';
import ClientDetails from './clients/ClientDetails';
import { AddClientModal, ReportModal, EditClientModal, DeleteConfirmationModal } from './clients/ClientModals';
import { fetchClientData, createClient, updateClient, deleteClient } from '../api/clientApi';
import { deleteProject } from '../api/projectsApi';

const Client = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clientsData, setClientsData] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, item: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchClientData();
      const nextClients = res.data.clients || [];
      setClientsData(nextClients);
      setStats(res.data.stats);
      setSelectedClient((current) => {
        if (!nextClients.length) return null;
        if (!current) return nextClients[0];
        return nextClients.find((client) => client.id === current.id) || nextClients[0];
      });
    } catch (error) {
      console.error("Failed to fetch client data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClient = async (newClientData) => {
    try {
      const payload = {
        id: newClientData.id || `CL-${Date.now()}`,
        name: newClientData.name,
        url: newClientData.website || '',
        industry: newClientData.industry,
        status: newClientData.status || 'Stable',
        budget: newClientData.budget || '0'
      };
      await createClient(payload);
      await loadData();
    } catch (error) {
      console.error("Failed to insert client into database", error);
      alert("Failed to create client in DB");
    }
  };

  const handleEditClient = async (updatedClient) => {
    try {
      await updateClient(updatedClient.id, {
        name: updatedClient.name,
        industry: updatedClient.industry,
        url: updatedClient.url || '',
        status: updatedClient.status || 'Stable',
        budget: updatedClient.budget || '0'
      });
      await loadData();
    } catch (error) {
      console.error("Failed to update client", error);
      alert("Failed to update client in DB");
    }
  };

  const handleDeleteClient = (id) => {
    const client = clientsData.find(c => c.id === id);
    setDeleteModal({
      isOpen: true,
      type: 'client',
      item: client
    });
  };

  const handleDeleteProject = (clientId, projectIndex) => {
    const client = clientsData.find(c => c.id === clientId);
    const project = client.projects[projectIndex];
    setDeleteModal({
      isOpen: true,
      type: 'project',
      item: { ...project, clientId, projectIndex }
    });
  };

  const executeDelete = async () => {
    const { type, item } = deleteModal;

    try {
      if (type === 'client') {
        await deleteClient(item.id);
      } else if (type === 'project') {
        await deleteProject(item.id);
      }
      await loadData();
    } catch (error) {
      console.error("Failed to delete item", error);
      alert(`Failed to delete ${type || 'item'} from DB`);
    }

    setDeleteModal({ isOpen: false, type: null, item: null });
  };

  // Filter Logic
  const filteredClients = clientsData.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading Clients...</div>;
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-20 relative min-h-screen">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {location.state?.showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Strategic Partners</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manage client relationships, track budgets, and monitor project health</p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <FileText size={14} className="text-[#3BA9FB]" />
            <span>Generate Report</span>
          </button>
          <button
            onClick={() => setIsAddClientOpen(true)}
            className="flex items-center gap-2 bg-[#3BA9FB] hover:bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/30 active:scale-95"
          >
            <Plus size={14} />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Row */}
      <ClientKPIs stats={stats} />

      {/* Row 2: Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-240px)] min-h-[500px]">
        {/* Left Panel: Client List (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <ClientList
            clients={filteredClients}
            selectedId={selectedClient?.id}
            onSelect={setSelectedClient}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>

        {/* Right Panel: Client Details (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <ClientDetails
            client={selectedClient}
            onEdit={() => setIsEditClientOpen(true)}
            onDeleteClient={handleDeleteClient}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      </div>

      {/* Modals */}
      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onAdd={handleAddClient}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <EditClientModal
        isOpen={isEditClientOpen}
        onClose={() => setIsEditClientOpen(false)}
        client={selectedClient}
        onSave={handleEditClient}
      />

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, item: null })}
        onConfirm={executeDelete}
        itemType={deleteModal.type === 'client' ? 'Client' : 'Project'}
        itemName={deleteModal.item?.name || 'Item'}
      />
    </div>
  );
};

export default Client;
