import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react';

export const AddClientModal = ({ isOpen, onClose, onAdd }) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        name: '',
        industry: 'Retail',
        website: '',
        budget: '',
        status: 'Stable'
    });
    const [isScanning, setIsScanning] = useState(false);
    const [fetchSuccess, setFetchSuccess] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleAutoFetch = (url) => {
        if (!url) return;
        setIsScanning(true);
        setFetchSuccess(false);

        // Professional simulation of data extraction (No hardcoded names)
        setTimeout(() => {
            const domain = url.replace(/^https?:\/\//, '').split('/')[0];
            const nameParts = domain.split('.');
            const extractedName = nameParts.length > 1 
                ? nameParts[nameParts.length - 2].charAt(0).toUpperCase() + nameParts[nameParts.length - 2].slice(1)
                : domain;

            setFormData(prev => ({
                ...prev,
                name: extractedName,
                website: url.startsWith('http') ? url : `https://${url}`
            }));

            setIsScanning(false);
            setFetchSuccess(true);
            setTimeout(() => setFetchSuccess(false), 3000);
        }, 1200);
    };

    const handleFileUpload = () => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => setUploadProgress(0), 1000);
            }
        }, 100);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0B1423] border border-white/5 rounded-3xl w-full max-w-lg p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#3BA9FB]/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-[#3BA9FB]/20 transition-all duration-1000"></div>
                
                <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                    <X size={18} />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Strategic Onboarding</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Initialize new partnership and resource allocation</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Website URL + Auto-Fetch */}
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Organization Domain / URL</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 placeholder:text-white/10 text-sm transition-all"
                                        placeholder="organization.com"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    />
                                    {fetchSuccess && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in">
                                            <CheckCircle size={16} />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAutoFetch(formData.website)}
                                    disabled={isScanning || !formData.website}
                                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                        ${isScanning
                                            ? 'bg-white/5 text-white/40 cursor-wait'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    {isScanning ? 'Extracting...' : 'Extract Info'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Organization Legal Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm"
                                placeholder="e.g. Acme Corp"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Primary Industry</label>
                            <select
                                className="w-full bg-[#121D2D] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm appearance-none"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="Retail" className="bg-[#121D2D] text-white">Retail</option>
                                <option value="SaaS" className="bg-[#121D2D] text-white">SaaS</option>
                                <option value="Finance" className="bg-[#121D2D] text-white">Finance</option>
                                <option value="Defense" className="bg-[#121D2D] text-white">Defense</option>
                                <option value="Healthcare" className="bg-[#121D2D] text-white">Healthcare</option>
                                <option value="Technology" className="bg-[#121D2D] text-white">Technology</option>
                                <option value="Automotive" className="bg-[#121D2D] text-white">Automotive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Initial Budget ($)</label>
                            <input
                                type="number"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm"
                                placeholder="0.00"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Status Tier</label>
                            <select
                                className="w-full bg-[#121D2D] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm appearance-none"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Stable" className="bg-[#121D2D] text-white">Stable</option>
                                <option value="Growing" className="bg-[#121D2D] text-white">Growing</option>
                                <option value="At Risk" className="bg-[#121D2D] text-white">At Risk</option>
                                <option value="Critical" className="bg-[#121D2D] text-white">Critical</option>
                            </select>
                        </div>
                    </div>

                    {/* Document Upload Area */}
                    <div 
                        onClick={handleFileUpload}
                        className="border-2 border-dashed border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-white/30 hover:bg-white/5 hover:border-[#3BA9FB]/30 hover:text-white transition-all cursor-pointer group/upload relative overflow-hidden"
                    >
                        {uploadProgress > 0 && (
                            <div className="absolute bottom-0 left-0 h-1 bg-[#3BA9FB] transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        )}
                        <Upload size={24} className="mb-3 group-hover/upload:scale-110 group-hover/upload:text-[#3BA9FB] transition-all" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Client Dossier</span>
                        <span className="text-[9px] text-white/20 font-bold mt-1 uppercase">CSV, PDF, or PDF (Max 20MB)</span>
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-[#3BA9FB] to-blue-600 hover:to-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98] mt-4">
                        Initialize Partner
                    </button>
                </form>
            </div>
        </div>
    );
};

export const ReportModal = ({ isOpen, onClose, clients }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportType, setReportType] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = (type, format) => {
        setIsGenerating(true);
        setReportType(type);
        
        setTimeout(() => {
            if (format === 'CSV' && clients) {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Client Name,Industry,Budget,Status,Projects Count\n";
                
                clients.forEach(c => {
                    const row = [
                        c.name,
                        c.industry,
                        c.budget,
                        c.status,
                        c.projects?.length || 0
                    ].join(",");
                    csvContent += row + "\n";
                });

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `${type.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                console.log(`Generating ${format} for ${type}`);
            }

            setIsGenerating(false);
            setReportType(null);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0B1423] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Intelligence Export</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Select report architecture for strategic review</p>
                </div>

                <div className="space-y-4">
                    {['Strategic Project Health', 'Resource Allocation Matrix', 'Commercial Budget Burn'].map((type, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-all group relative overflow-hidden">
                            {isGenerating && reportType === type && (
                                <div className="absolute inset-0 bg-[#3BA9FB]/10 flex items-center justify-center backdrop-blur-sm z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-[#3BA9FB] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-black text-[#3BA9FB] uppercase tracking-[0.2em]">Compiling Data...</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-white/5 rounded-2xl text-[#3BA9FB] group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <span className="text-white text-sm font-bold uppercase tracking-tight">{type}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={isGenerating}
                                    onClick={() => handleGenerate(type, 'CSV')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-[#3BA9FB] rounded-lg text-[9px] text-white/60 hover:text-white font-black uppercase tracking-widest transition-all"
                                >
                                    CSV
                                </button>
                                <button
                                    disabled={isGenerating}
                                    onClick={() => handleGenerate(type, 'PDF')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-[#3BA9FB] rounded-lg text-[9px] text-white/60 hover:text-white font-black uppercase tracking-widest transition-all"
                                >
                                    PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4">
                    {showSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                            <CheckCircle size={18} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Intelligence Export Successful</span>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button onClick={onClose} className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Close Portal</button>
                    </div>
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
        website: client.url || '',
        budget: client.budget || '',
        status: client.status || 'Stable'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...client, ...formData });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0B1423] border border-white/5 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                    <X size={18} />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Edit Strategic Partner</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Update relationship parameters and budget</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Organization Legal Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Industry</label>
                            <select
                                className="w-full bg-[#121D2D] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm appearance-none"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="Retail" className="bg-[#121D2D] text-white">Retail</option>
                                <option value="SaaS" className="bg-[#121D2D] text-white">SaaS</option>
                                <option value="Finance" className="bg-[#121D2D] text-white">Finance</option>
                                <option value="Defense" className="bg-[#121D2D] text-white">Defense</option>
                                <option value="Healthcare" className="bg-[#121D2D] text-white">Healthcare</option>
                                <option value="Technology" className="bg-[#121D2D] text-white">Technology</option>
                                <option value="Automotive" className="bg-[#121D2D] text-white">Automotive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Website URL</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Total Budget ($)</label>
                            <input
                                type="number"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Status Tier</label>
                            <select
                                className="w-full bg-[#121D2D] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#3BA9FB]/50 text-sm appearance-none"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Stable" className="bg-[#121D2D] text-white">Stable</option>
                                <option value="Growing" className="bg-[#121D2D] text-white">Growing</option>
                                <option value="At Risk" className="bg-[#121D2D] text-white">At Risk</option>
                                <option value="Critical" className="bg-[#121D2D] text-white">Critical</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-[#3BA9FB] to-blue-600 hover:to-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98]">
                        Save Strategic Changes
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
