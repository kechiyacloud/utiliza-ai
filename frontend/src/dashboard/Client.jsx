import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import ClientKPIs from './clients/ClientKPIs';
import ClientList from './clients/ClientList';
import ClientDetails from './clients/ClientDetails';
import { AddClientModal, ReportModal, EditClientModal, DeleteConfirmationModal } from './clients/ClientModals';
import { fetchClientData } from '../api/clientApi';

const Client = () => {
  const [clientsData, setClientsData] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, item: null });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchClientData();
        setClientsData(res.data.clients);
        if (res.data.clients.length > 0) {
          setSelectedClient(res.data.clients[0]);
        }
      } catch (error) {
        console.error("Failed to fetch client data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddClient = (newClientData) => {
    const newClient = {
      id: clientsData.length + 1,
      ...newClientData,
      logo: newClientData.name.substring(0, 2).toUpperCase(),
      activeProjects: 0,
      projects: [], // Initialize with empty projects array
      contact: "+1 (555) 000-0000" // Default
    };
    const updatedList = [...clientsData, newClient];
    setClientsData(updatedList);
    setSelectedClient(newClient); // Auto-select new client
  };

  const handleEditClient = (updatedClient) => {
    const updatedList = clientsData.map(c =>
      c.id === updatedClient.id ? updatedClient : c
    );
    setClientsData(updatedList);
    setSelectedClient(updatedClient);
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

  const executeDelete = () => {
    const { type, item } = deleteModal;

    if (type === 'client') {
      const updatedList = clientsData.filter(c => c.id !== item.id);
      setClientsData(updatedList);

      if (selectedClient && selectedClient.id === item.id) {
        setSelectedClient(updatedList.length > 0 ? updatedList[0] : null);
      }
    } else if (type === 'project') {
      const updatedList = clientsData.map(client => {
        if (client.id === item.clientId) {
          const updatedProjects = [...client.projects];
          updatedProjects.splice(item.projectIndex, 1);
          return { ...client, projects: updatedProjects, activeProjects: updatedProjects.length };
        }
        return client;
      });

      setClientsData(updatedList);

      if (selectedClient && selectedClient.id === item.clientId) {
        const updatedClient = updatedList.find(c => c.id === item.clientId);
        setSelectedClient(updatedClient);
      }
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client relationships, track budgets, and monitor project health.</p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileText size={16} className="text-[#3BA9FB]" />
            <span>Report</span>
          </button>
          <button
            onClick={() => setIsAddClientOpen(true)}
            className="flex items-center gap-2 bg-[#3BA9FB] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Row */}
      <ClientKPIs />

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