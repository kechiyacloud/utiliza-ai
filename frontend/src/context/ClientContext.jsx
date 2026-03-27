import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ClientContext = createContext();

export const ClientProvider = ({ children }) => {
    const [clients, setClients] = useState([]);

    // CRUD Operations
    const addClient = useCallback((client) => {
        setClients(prev => [...prev, { ...client, id: Date.now() }]);
    }, []);

    const updateClient = useCallback((id, updates) => {
        setClients(prev =>
            prev.map(client => client.id === id ? { ...client, ...updates } : client)
        );
    }, []);

    const deleteClient = useCallback((id) => {
        setClients(prev => prev.filter(client => client.id !== id));
    }, []);

    const getClientById = useCallback((id) => {
        return clients.find(client => client.id === id);
    }, [clients]);

    const getClientsByIndustry = useCallback((industry) => {
        return clients.filter(client => client.industry === industry);
    }, [clients]);

    // Project operations within clients
    const addProjectToClient = useCallback((clientId, project) => {
        setClients(prev =>
            prev.map(client =>
                client.id === clientId
                    ? { ...client, projects: [...(client.projects || []), project] }
                    : client
            )
        );
    }, []);

    const deleteProjectFromClient = useCallback((clientId, projectIndex) => {
        setClients(prev =>
            prev.map(client =>
                client.id === clientId
                    ? { ...client, projects: client.projects.filter((_, i) => i !== projectIndex) }
                    : client
            )
        );
    }, []);

    const value = useMemo(() => ({
        clients,
        setClients,
        addClient,
        updateClient,
        deleteClient,
        getClientById,
        getClientsByIndustry,
        addProjectToClient,
        deleteProjectFromClient
    }), [clients, addClient, updateClient, deleteClient, getClientById, getClientsByIndustry, addProjectToClient, deleteProjectFromClient]);

    return (
        <ClientContext.Provider value={value}>
            {children}
        </ClientContext.Provider>
    );
};

export const useClients = () => {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClients must be used within ClientProvider');
    }
    return context;
};
