import React, { useState } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { PROJECT_STATUS_OPTIONS } from '../../data/constants';

const FilterPanel = ({ isOpen, onClose, onApplyFilters }) => {
    const [filters, setFilters] = useState({
        name: '',
        resourceName: '',
        monthWeek: '',
        status: '',
        allocation: '',
        resourceType: ''
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

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/10 z-40 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Side Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-100">
                <div className="h-full flex flex-col">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Filter Projects</h2>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Refine List</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col gap-6">

                            {/* Project Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Project Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter project name..."
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white"
                                    value={filters.name}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Resource Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Resource Name</label>
                                <input
                                    type="text"
                                    name="resourceName"
                                    placeholder="Search by team member..."
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white"
                                    value={filters.resourceName}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Project Status</label>
                                <select
                                    name="status"
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 focus:bg-white cursor-pointer"
                                    value={filters.status}
                                    onChange={handleChange}
                                >
                                    <option value="">All Statuses</option>
                                    {PROJECT_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Month / Week Filter */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Time Period</label>
                                <select
                                    name="monthWeek"
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 focus:bg-white cursor-pointer"
                                    value={filters.monthWeek}
                                    onChange={handleChange}
                                >
                                    <option value="">Any Time</option>
                                    <option value="this-month">This Month</option>
                                    <option value="next-month">Next Month</option>
                                    <option value="this-week">This Week</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Allocation % */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Min. Allocation %</label>
                                    <input
                                        type="number"
                                        name="allocation"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 focus:bg-white"
                                        value={filters.allocation}
                                        onChange={handleChange}
                                    />
                                </div>

                                {/* Resource Type */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Resource Type</label>
                                    <select
                                        name="resourceType"
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 focus:bg-white cursor-pointer"
                                        value={filters.resourceType}
                                        onChange={handleChange}
                                    >
                                        <option value="">All Types</option>
                                        <option value="Billable">Billable</option>
                                        <option value="Non-Billable">Non-Billable</option>
                                        <option value="Shadow">Shadow</option>
                                    </select>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-50 bg-white">
                        <button
                            onClick={handleApply}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <Filter size={18} />
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FilterPanel;
