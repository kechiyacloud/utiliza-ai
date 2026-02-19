import React, { useState } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';

const FilterPanel = ({ isOpen, onClose, onApplyFilters }) => {
    const [filters, setFilters] = useState({
        name: '',
        type: '',
        status: '',
        minResources: '',
        startDate: '',
        endDate: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            name: '',
            type: '',
            status: '',
            minResources: '',
            startDate: '',
            endDate: ''
        };
        setFilters(resetFilters);
        onApplyFilters(resetFilters); // Optional: Apply reset immediately or wait for "Apply"
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
                <div className="h-full flex flex-col">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Filter Projects</h2>
                            <p className="text-xs text-gray-400">Refine your project list</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col gap-6">

                            {/* Project Name */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Search by name..."
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800"
                                    value={filters.name}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Type */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                                <select
                                    name="type"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={filters.type}
                                    onChange={handleChange}
                                >
                                    <option value="">All Types</option>
                                    <option value="Client">Client</option>
                                    <option value="Internal">Internal</option>
                                    <option value="POC">POC</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                <select
                                    name="status"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={filters.status}
                                    onChange={handleChange}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Delayed">Delayed</option>
                                    <option value="Completed">Completed</option>
                                    <option value="On Hold">On Hold</option>
                                </select>
                            </div>

                            {/* Resource Count */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Min Employees</label>
                                <input
                                    type="number"
                                    name="minResources"
                                    placeholder="0"
                                    min="0"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={filters.minResources}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Start Date (After)</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        value={filters.startDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">End Date (Before)</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        value={filters.endDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={handleReset}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-white transition-all shadow-sm flex items-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                        >
                            <Filter size={16} />
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FilterPanel;
