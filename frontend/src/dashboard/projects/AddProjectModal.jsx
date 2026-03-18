import React, { useState } from 'react';
import { X, Calendar, Plus } from 'lucide-react';
import { PROJECT_STATUS_OPTIONS } from '../../data/constants';

const AddProjectModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Client', // Default
        client: '',
        status: 'Not Started',
        startDate: '',
        endDate: '',
        resources: 0
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Add New Project</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Project Name */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Project Name"
                            className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Client Selection (Conditional) */}
                    {formData.type === 'Client' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Client</label>
                            <div className="flex gap-2">
                                <select
                                    name="client"
                                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={formData.client}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Client</option>
                                    <option value="TechGlobal Inc">TechGlobal Inc</option>
                                    <option value="FinServe Corp">FinServe Corp</option>
                                    <option value="HealthPlus Med">HealthPlus Med</option>
                                    <option value="MegaCorp">MegaCorp</option>
                                </select>
                                <button type="button" className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Type & Status Row */}
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                            <select
                                name="type"
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option value="Client">Client</option>
                                <option value="Internal">Internal</option>
                                <option value="Partner">Partner</option>
                            </select>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select
                                name="status"
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                {PROJECT_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dates Row */}
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1 relative">
                            <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full"
                                value={formData.startDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-1 relative">
                            <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full"
                                value={formData.endDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Resource Estimate */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Resource Estimate</label>
                        <input
                            type="number"
                            name="resources"
                            min="0"
                            placeholder="0"
                            className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            value={formData.resources}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-200 transition-colors"
                        >
                            Create Project
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AddProjectModal;
