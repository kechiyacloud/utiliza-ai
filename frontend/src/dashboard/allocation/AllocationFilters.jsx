import React, { useState, useEffect } from 'react';
import { Layers, Filter, MapPin } from 'lucide-react';
import { fetchFilterOptions } from '../../api/allocationApi';

const AllocationFilters = ({ filters, setFilters }) => {
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        const loadOptions = async () => {
            const options = await fetchFilterOptions();
            if (options) {
                if (options.departments) setDepartments(options.departments);
                if (options.locations) setLocations(options.locations);
            }
        };
        loadOptions();
    }, []);

    return (
        <div className="flex gap-2 flex-wrap items-center">
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
                    {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {/* Location Filter */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <MapPin size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <select
                    className="pl-7 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 outline-none focus:ring-1 focus:ring-blue-100 hover:border-gray-300 transition-all cursor-pointer appearance-none min-w-[110px]"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                >
                    <option>All Locations</option>
                    {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
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
