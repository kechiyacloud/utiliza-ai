import React, { useState } from 'react';
import { X, Building2, ArrowRight, ArrowLeft } from 'lucide-react';

const AddClientModal = ({ isOpen, onClose, onAdd }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        url: '',
        name: '',
        industry: 'Retail',
        status: 'Stable',
        budget: ''
    });

    if (!isOpen) return null;

    const handleClose = () => {
        setStep(1);
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare payload that matches a general schema (similar to add project)
        const payload = {
            ...formData,
            id: 'CLI-' + Math.floor(Math.random() * 10000)
        };

        if (onAdd) await onAdd(payload);

        handleClose();
        setFormData({
            url: '',
            name: '',
            industry: 'Retail',
            status: 'Stable',
            budget: ''
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity">
            {/* Modal Container */}
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-gray-800 text-white">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add New Client</h2>
                        <div className="flex gap-1 mt-2">
                            <div className={`h-1.5 w-12 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                            <div className={`h-1.5 w-12 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Company Name */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Company Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter company name"
                                    className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-200 placeholder-gray-500"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Website URL */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Website URL</label>
                                <input
                                    type="text"
                                    name="url"
                                    placeholder="Enter website URL"
                                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-200 placeholder-gray-500"
                                    value={formData.url}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Industry */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Industry</label>
                                <select
                                    name="industry"
                                    className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                                    style={{ colorScheme: 'dark' }}
                                    value={formData.industry}
                                    onChange={handleChange}
                                >
                                    <option value="Retail" className="bg-gray-800 text-white">Retail</option>
                                    <option value="Finance" className="bg-gray-800 text-white">Finance</option>
                                    <option value="Healthcare" className="bg-gray-800 text-white">Healthcare</option>
                                    <option value="Technology" className="bg-gray-800 text-white">Technology</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (formData.name) setStep(2);
                                    else alert("Please enter the company name first");
                                }}
                                className="w-full py-3 mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all"
                            >
                                Next Step <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                                <select
                                    name="status"
                                    className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
                                    style={{ colorScheme: 'dark' }}
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="Stable" className="bg-gray-800 text-white">Stable</option>
                                    <option value="At Risk" className="bg-gray-800 text-white">At Risk</option>
                                    <option value="Growing" className="bg-gray-800 text-white">Growing</option>
                                </select>
                            </div>

                            {/* Total Budget */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Total Budget ($)</label>
                                <input
                                    type="number"
                                    name="budget"
                                    placeholder="Enter total budget"
                                    className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-200 placeholder-gray-500"
                                    value={formData.budget}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Document Upload */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Client Documentation (PDF/CSV)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf,.csv,.doc,.docx"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => console.log('File selected:', e.target.files[0])}
                                    />
                                    <div className="p-3 bg-gray-800 border border-dashed border-gray-600 rounded-xl text-sm text-gray-400 group-hover:border-blue-500 group-hover:text-gray-300 transition-all flex items-center justify-center gap-2">
                                        <Download size={16} />
                                        <span>Click to upload client documents</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 italic">Upload relevant project details or client overview files.</p>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-1/3 py-3 rounded-xl flex items-center justify-center gap-2 bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-all"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <button
                                    type="submit"
                                    className="w-2/3 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    Create Client
                                </button>
                            </div>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
