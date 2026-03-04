import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react';

export const AddClientModal = ({ isOpen, onClose, onAdd }) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        name: '',
        industry: 'Retail',

        website: '',
        logo: ''
    });
    const [isScanning, setIsScanning] = useState(false);
    const [fetchSuccess, setFetchSuccess] = useState(false);

    const handleAutoFetch = (url) => {
        if (!url) return;
        setIsScanning(true);
        setFetchSuccess(false);

        // Simulate network request (1.5s delay)
        setTimeout(() => {
            const lowerUrl = url.toLowerCase();
            let fetchedName, fetchedIndustry, fetchedStatus, fetchedLogo;

            if (lowerUrl.includes('tesla')) {
                fetchedName = 'Tesla';
                fetchedIndustry = 'Automotive';
                fetchedStatus = 'Stable';
            } else if (lowerUrl.includes('google')) {
                fetchedName = 'Google';
                fetchedIndustry = 'Technology';
                fetchedStatus = 'Stable';
            } else if (lowerUrl.includes('amazon')) {
                fetchedName = 'Amazon';
                fetchedIndustry = 'Retail';
                fetchedStatus = 'Stable';
            } else if (lowerUrl.includes('microsoft')) {
                fetchedName = 'Microsoft';
                fetchedIndustry = 'Technology';
                fetchedStatus = 'Stable';
            } else {
                // Extract name from URL
                fetchedName = lowerUrl.includes('www.')
                    ? url.split('.')[1].charAt(0).toUpperCase() + url.split('.')[1].slice(1)
                    : 'Acme Corp';
                fetchedIndustry = 'Retail';
                fetchedStatus = 'Active';
            }

            fetchedLogo = 'https://via.placeholder.com/150';

            setFormData(prev => ({
                ...prev,
                name: fetchedName,


            }));

            setIsScanning(false);
            setFetchSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => setFetchSuccess(false), 3000);
        }, 1500);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#122436] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Add New Client</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Website URL + Auto-Fetch */}
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-1">Website URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3BA9FB] placeholder:text-white/30"
                                placeholder="e.g. www.tesla.com"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => handleAutoFetch(formData.website)}
                                disabled={isScanning || !formData.website}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2
                                    ${isScanning
                                        ? 'bg-[#3BA9FB]/20 text-[#3BA9FB] cursor-wait'
                                        : 'bg-[#3BA9FB] hover:bg-[#2563EB] text-white shadow-lg shadow-blue-500/20'
                                    }
                                    ${!formData.website ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {isScanning ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#3BA9FB] border-t-transparent rounded-full animate-spin"></div>
                                        Scanning...
                                    </>
                                ) : (
                                    'Auto-Fetch'
                                )}
                            </button>
                        </div>
                        {/* Success Indicator */}
                        {fetchSuccess && (
                            <div className="flex items-center gap-2 mt-2 text-green-400 text-xs animate-in fade-in duration-300">
                                <CheckCircle size={14} />
                                <span>Data Retrieved Successfully</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-1">Company Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3BA9FB]"
                            placeholder="e.g. Globex Corp"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1">Industry</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3BA9FB]"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="Retail">Retail</option>
                                <option value="SaaS">SaaS</option>
                                <option value="Finance">Finance</option>
                                <option value="Defense">Defense</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Technology">Technology</option>
                                <option value="Automotive">Automotive</option>
                            </select>
                        </div>

                    </div>



                    {/* Logo Placeholder */}
                    <div className="border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                        <Upload size={20} className="mb-2" />
                        <span className="text-xs">Upload Logo</span>
                    </div>

                    <button type="submit" className="w-full bg-[#3BA9FB] hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 mt-2">
                        Create Client
                    </button>
                </form>
            </div>
        </div>
    );
};

export const ReportModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#122436] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-2">Generate Report</h2>
                <p className="text-white/50 text-sm mb-6">Select report type and format.</p>

                <div className="space-y-4">
                    {['Project Health', 'Resource Usage'].map((type, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-[#3BA9FB]/10 rounded-lg text-[#3BA9FB]">
                                    <FileText size={20} />
                                </div>
                                <span className="text-white font-medium">{type}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60 group-hover:bg-[#3BA9FB] group-hover:text-white transition-colors">PDF</span>
                                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60 group-hover:bg-[#3BA9FB] group-hover:text-white transition-colors">CSV</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="text-white/60 hover:text-white text-sm mr-4">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export const EditClientModal = ({ isOpen, onClose, client, onSave }) => {
    if (!isOpen || !client) return null;

    const [formData, setFormData] = useState({
        name: client.name,
        industry: client.industry,

    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...client, ...formData });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#122436] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Edit Client</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-1">Company Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3BA9FB]"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-1">Industry</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3BA9FB]"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="Retail">Retail</option>
                                <option value="SaaS">SaaS</option>
                                <option value="Finance">Finance</option>
                                <option value="Defense">Defense</option>
                                <option value="Healthcare">Healthcare</option>
                            </select>
                        </div>

                    </div>



                    <button type="submit" className="w-full bg-[#3BA9FB] hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-500/20 mt-2">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};
export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
    if (!isOpen) return null;

    const [confirmInput, setConfirmInput] = React.useState('');
    const isMatch = confirmInput.toLowerCase() === 'delete';

    const handleConfirm = () => {
        if (isMatch) {
            onConfirm();
            onClose();
            setConfirmInput('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#122436] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                        <Trash2 size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Delete {itemType}?</h2>
                    <p className="text-white/60 text-sm">
                        Are you sure you want to delete <span className="text-white font-medium">"{itemName}"</span>? This action cannot be undone.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">
                            Type <span className="text-white select-all">delete</span> to confirm
                        </label>
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500/50 placeholder:text-white/20 text-center font-mono"
                            placeholder="delete"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!isMatch}
                            className={`flex-1 font-medium py-2.5 rounded-xl transition-all shadow-lg
                                ${isMatch
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                }
                            `}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
