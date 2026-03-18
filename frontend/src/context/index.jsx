import React from 'react';
import { EmployeeProvider, useEmployees as useEmployeesHook } from './EmployeeContext';
import { ClientProvider, useClients as useClientsHook } from './ClientContext';
import { ProjectProvider, useProjects as useProjectsHook } from './ProjectContext';

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
    return {
        employees: useEmployeesHook(),
        clients: useClientsHook(),
        projects: useProjectsHook()
    };
};
