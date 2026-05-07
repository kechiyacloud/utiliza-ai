import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DataRefreshContext = createContext();

export const DataRefreshProvider = ({ children }) => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isDirty, setIsDirty] = useState(false);

    const triggerRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    const value = useMemo(() => ({
        refreshKey,
        triggerRefresh,
        isDirty,
        setIsDirty
    }), [refreshKey, triggerRefresh, isDirty, setIsDirty]);

    return (
        <DataRefreshContext.Provider value={value}>
            {children}
        </DataRefreshContext.Provider>
    );
};

export const useDataRefresh = () => {
    const context = useContext(DataRefreshContext);
    if (!context) {
        throw new Error('useDataRefresh must be used within DataRefreshProvider');
    }
    return context;
};
