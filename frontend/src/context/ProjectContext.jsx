import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);

    // CRUD Operations
    const addProject = (project) => {
        setProjects(prev => [...prev, { ...project, id: Date.now() }]);
    };

    const updateProject = (id, updates) => {
        setProjects(prev =>
            prev.map(proj => proj.id === id ? { ...proj, ...updates } : proj)
        );
    };

    const deleteProject = (id) => {
        setProjects(prev => prev.filter(proj => proj.id !== id));
    };

    const getProjectById = (id) => {
        return projects.find(proj => proj.id === id);
    };

    const getProjectsByClient = (clientId) => {
        return projects.filter(proj => proj.clientId === clientId);
    };

    const getProjectsByStatus = (status) => {
        return projects.filter(proj => proj.status === status);
    };

    const value = {
        projects,
        setProjects,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        getProjectsByClient,
        getProjectsByStatus
    };

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
