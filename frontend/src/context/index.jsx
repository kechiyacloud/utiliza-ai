import React from 'react';
import { EmployeeProvider, useEmployees as useEmployeesHook } from './EmployeeContext';
import { ClientProvider, useClients as useClientsHook } from './ClientContext';
import { ProjectProvider, useProjects as useProjectsHook } from './ProjectContext';
import { DataRefreshProvider, useDataRefresh as useDataRefreshHook } from './DataRefreshContext';

/**
 * Composite provider that wraps all data contexts
 * This provides a single entry point for all data management
 */
export const AppDataProvider = ({ children }) => {
    return (
        <DataRefreshProvider>
            <EmployeeProvider>
                <ClientProvider>
                    <ProjectProvider>
                        {children}
                    </ProjectProvider>
                </ClientProvider>
            </EmployeeProvider>
        </DataRefreshProvider>
    );
};

// Re-export individual hooks for convenience
export { useEmployees } from './EmployeeContext';
export { useClients } from './ClientContext';
export { useProjects } from './ProjectContext';
export { useDataRefresh } from './DataRefreshContext';

// Composite hook that provides access to all contexts at once  
export const useAppData = () => {
    return {
        employees: useEmployeesHook(),
        clients: useClientsHook(),
        projects: useProjectsHook(),
        dataRefresh: useDataRefreshHook()
    };
};
