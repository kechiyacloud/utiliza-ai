import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';

const EditProjectPanel = ({ isOpen, onClose, project, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Client',
        client: '',
        status: 'In Progress',
        startDate: '',
        endDate: '',
        resources: 0
    });

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                type: project.type || 'Client',
                client: project.client || '',
                status: project.status || 'In Progress',
                startDate: project.startDate || '',
                endDate: project.endDate || '',
                resources: project.resources || 0
            });
        }
    }, [project]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...project, ...formData });
        onClose();
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
                            <h2 className="text-xl font-bold text-gray-800">Edit Project</h2>
                            <p className="text-xs text-gray-400">ID: {project?.id}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="edit-project-form" onSubmit={handleSubmit} className="flex flex-col gap-5">

                            {/* Project Name */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Project Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800"
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

                            {/* Type */}
                            <div className="flex flex-col gap-1">
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

                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                <select
                                    name="status"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="In Progress">In Progress</option>
                                    <option value="Delayed">Delayed</option>
                                    <option value="Completed">Completed</option>
                                    <option value="On Hold">On Hold</option>
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
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
                                    disabled
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-white transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            form="edit-project-form"
                            type="submit"
                            className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditProjectPanel;
