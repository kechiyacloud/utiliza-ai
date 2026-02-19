import React, { createContext, useContext, useState } from 'react';

const EmployeeContext = createContext();

export const EmployeeProvider = ({ children }) => {
    const [employees, setEmployees] = useState([]);

    // CRUD Operations
    const addEmployee = (employee) => {
        setEmployees(prev => [...prev, { ...employee, id: Date.now() }]);
    };

    const updateEmployee = (id, updates) => {
        setEmployees(prev =>
            prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp)
        );
    };

    const deleteEmployee = (id) => {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
    };

    const getEmployeeById = (id) => {
        return employees.find(emp => emp.id === id);
    };

    const getEmployeesByDepartment = (department) => {
        return employees.filter(emp => emp.department === department);
    };

    const getEmployeesByStatus = (status) => {
        return employees.filter(emp => emp.employee_status === status);
    };

    const value = {
        employees,
        setEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        getEmployeeById,
        getEmployeesByDepartment,
        getEmployeesByStatus
    };

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
