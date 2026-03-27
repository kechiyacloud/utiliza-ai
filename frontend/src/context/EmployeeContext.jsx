import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const EmployeeContext = createContext();

export const EmployeeProvider = ({ children }) => {
    const [employees, setEmployees] = useState([]);

    // CRUD Operations
    const addEmployee = useCallback((employee) => {
        setEmployees(prev => [...prev, { ...employee, id: Date.now() }]);
    }, []);

    const updateEmployee = useCallback((id, updates) => {
        setEmployees(prev =>
            prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp)
        );
    }, []);

    const deleteEmployee = useCallback((id) => {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
    }, []);

    const getEmployeeById = useCallback((id) => {
        return employees.find(emp => emp.id === id);
    }, [employees]);

    const getEmployeesByDepartment = useCallback((department) => {
        return employees.filter(emp => emp.department === department);
    }, [employees]);

    const getEmployeesByStatus = useCallback((status) => {
        return employees.filter(emp => emp.employee_status === status);
    }, [employees]);

    const value = useMemo(() => ({
        employees,
        setEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        getEmployeeById,
        getEmployeesByDepartment,
        getEmployeesByStatus
    }), [employees, addEmployee, updateEmployee, deleteEmployee, getEmployeeById, getEmployeesByDepartment, getEmployeesByStatus]);

    return (
        <EmployeeContext.Provider value={value}>
            {children}
        </EmployeeContext.Provider>
    );
};

export const useEmployees = () => {
    const context = useContext(EmployeeContext);
    if (!context) {
        throw new Error('useEmployees must be used within EmployeeProvider');
    }
    return context;
};
