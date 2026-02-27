import React, { useState } from 'react';

// Insight Components
import BenchPool from './BenchPool';
import SkillsOverview from './SkillsOverview';
import UtilizationTrend from './UtilizationTrend';

const EmployeeInsights = ({ employees, filters }) => {
    const [activeTab, setActiveTab] = useState('skills');

    // Filter employees by department (if selected in the global filter overlay)
    const filteredEmployees = employees.filter(emp => {
        if (filters?.departments && filters.departments.length > 0) {
            return filters.departments.includes(emp.department);
        }
        return true; // If no department selected, show all
    });

    const tabs = [
        { id: 'skills', label: 'Skills Overview' },
        { id: 'trend', label: 'Utilization Trend' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'skills':
                return <SkillsOverview employees={filteredEmployees} />;
            case 'trend':
                return <UtilizationTrend employees={filteredEmployees} />;
            default:
                return <div className="p-10 text-center text-gray-500">Component Under Construction</div>;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full mb-6">
            <div className="border-b border-gray-100 bg-gray-50/50 p-4 pb-0 overflow-x-auto custom-scrollbar">
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-blue-600 border-t border-l border-r border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] translate-y-[1px]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default EmployeeInsights;
