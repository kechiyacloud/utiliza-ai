import React from 'react';
import { EmployeeProvider } from './EmployeeContext';
import { ClientProvider } from './ClientContext';
import { ProjectProvider } from './ProjectContext';

/**
 * Composite provider that wraps all data contexts
 * This provides a single entry point for all data management
 */
export const AppDataProvider = ({ children }) => {
    return (
        <EmployeeProvider>
            <ClientProvider>
                <ProjectProvider>
                    {children}
                </ProjectProvider>
            </ClientProvider>
        </EmployeeProvider>
    );
};

// Re-export individual hooks for convenience
export { useEmployees } from './EmployeeContext';
export { useClients } from './ClientContext';
export { useProjects } from './ProjectContext';

// Composite hook that provides access to all contexts at once  
export const useAppData = () => {
    const { useEmployees } = require('./EmployeeContext');
    const { useClients } = require('./ClientContext');
    const { useProjects } = require('./ProjectContext');

    return {
        employees: useEmployees(),
        clients: useClients(),
        projects: useProjects()
    };
};
