import React, { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';

const AddClientModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        url: '',
        name: '',
        industry: 'Retail',
        status: 'Stable',
        budget: '',
        logo: null
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Adding Client:", formData);
        if (onAdd) onAdd(formData);
        onClose();
        // Reset
        setFormData({
            url: '',
            name: '',
            industry: 'Retail',
            status: 'Stable',
            budget: '',
            logo: null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity">
            {/* Modal Container */}
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-gray-800 text-white">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Add New Client</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* Website URL */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">Website URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="url"
                                placeholder="e.g. www.tesla.com"
                                className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-200 placeholder-gray-500"
                                value={formData.url}
                                onChange={handleChange}
                            />
                            <button type="button" className="px-3 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-600/30 transition-colors uppercase tracking-wider border border-blue-600/30">
                                Auto-Fetch
                            </button>
                        </div>
                    </div>

                    {/* Company Name */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">Company Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="e.g. Globex Corp"
                            className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-200 placeholder-gray-500"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Industry & Status Row */}
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Industry</label>
                            <select
                                name="industry"
                                className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
                                value={formData.industry}
                                onChange={handleChange}
                            >
                                <option value="Retail">Retail</option>
                                <option value="Finance">Finance</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Technology">Technology</option>
                            </select>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                            <select
                                name="status"
                                className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-300"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="Stable">Stable</option>
                                <option value="At Risk">At Risk</option>
                                <option value="Growing">Growing</option>
                            </select>
                        </div>
                    </div>

                    {/* Total Budget */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">Total Budget ($)</label>
                        <input
                            type="number"
                            name="budget"
                            placeholder="e.g. 500000"
                            className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-200 placeholder-gray-500"
                            value={formData.budget}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Upload Logo Area */}
                    <div className="border border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-800/50 transition-colors cursor-pointer group">
                        <Upload size={24} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Upload Logo</span>
                    </div>

                    {/* Action Button */}
                    <button
                        type="submit"
                        className="w-full py-3 mt-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Create Client
                    </button>

                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
