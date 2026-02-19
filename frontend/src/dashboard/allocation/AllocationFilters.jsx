import React from 'react';
import { Calendar, Layers, Filter } from 'lucide-react';

const AllocationFilters = ({ filters, setFilters }) => {
    return (
        <div className="flex gap-2 flex-wrap items-center">
            {/* Date Range */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Calendar size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <select
                    className="pl-7 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-100 hover:border-gray-300 transition-all cursor-pointer appearance-none"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                >
                    <option>Jan 2026 - Apr 2026</option>
                    <option>May 2026 - Aug 2026</option>
                    <option>Sep 2026 - Dec 2026</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {/* Department Filter */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Layers size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <select
                    className="pl-7 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-100 hover:border-gray-300 transition-all cursor-pointer appearance-none min-w-[120px]"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                    <option>All Departments</option>
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>DevOps</option>
                    <option>Product</option>
                    <option>QA</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {/* Resource Type Filter */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Filter size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <select
                    className="pl-7 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-100 hover:border-gray-300 transition-all cursor-pointer appearance-none min-w-[110px]"
                    value={filters.resourceType}
                    onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                >
                    <option>All Resources</option>
                    <option>Billable Only</option>
                    <option>Internal Only</option>
                    <option>Bench Strength</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>
    );
};

export default AllocationFilters;
