import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);

    // CRUD Operations
    const addProject = useCallback((project) => {
        setProjects(prev => [...prev, { ...project, id: Date.now() }]);
    }, []);

    const updateProject = useCallback((id, updates) => {
        setProjects(prev =>
            prev.map(proj => proj.id === id ? { ...proj, ...updates } : proj)
        );
    }, []);

    const deleteProject = useCallback((id) => {
        setProjects(prev => prev.filter(proj => proj.id !== id));
    }, []);

    const getProjectById = useCallback((id) => {
        return projects.find(proj => proj.id === id);
    }, [projects]);

    const getProjectsByClient = useCallback((clientId) => {
        return projects.filter(proj => proj.clientId === clientId);
    }, [projects]);

    const getProjectsByStatus = useCallback((status) => {
        return projects.filter(proj => proj.status === status);
    }, [projects]);

    const value = useMemo(() => ({
        projects,
        setProjects,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        getProjectsByClient,
        getProjectsByStatus
    }), [projects, addProject, updateProject, deleteProject, getProjectById, getProjectsByClient, getProjectsByStatus]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within ProjectProvider');
    }
    return context;
};
