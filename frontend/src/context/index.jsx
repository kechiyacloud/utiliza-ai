import React from 'react';
import { EmployeeProvider, useEmployees as useEmployeesHook } from './EmployeeContext';
import { ClientProvider, useClients as useClientsHook } from './ClientContext';
import { ProjectProvider, useProjects as useProjectsHook } from './ProjectContext';
import { DataRefreshProvider, useDataRefresh as useDataRefreshHook } from './DataRefreshContext';
import { AuthProvider } from './AuthContext';

export { useAuth } from './AuthContext';

export const AppDataProvider = ({ children }) => {
    return (
        <AuthProvider>
            <DataRefreshProvider>
                <EmployeeProvider>
                    <ClientProvider>
                        <ProjectProvider>
                            {children}
                        </ProjectProvider>
                    </ClientProvider>
                </EmployeeProvider>
            </DataRefreshProvider>
        </AuthProvider>
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
