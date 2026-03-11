import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Building, Users } from 'lucide-react';
import axios from '../../api/axios';

const AddProjectPanel = ({ isOpen, onClose, onAdd }) => {


    // --- Form State ---
    const [formData, setFormData] = useState({
        name: '',
        billable: 'Billable',
        status: 'Planned',
        startDate: '',
        endDate: '',
        teamMembers: []
    });

    // --- UI State ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch initial data
    useEffect(() => {
        if (isOpen) {
            // Reset form
            setFormData({
                name: '',
                billable: 'Billable',
                status: 'Planned',
                startDate: '',
                endDate: '',
                teamMembers: []
            });
        }
    }, [isOpen]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Team Member Logic ---
    const handleAddTeamMember = () => {
        setFormData(prev => ({
            ...prev,
            teamMembers: [
                ...prev.teamMembers,
                { name: '', role: '', company: 'Cloud Destinations', company_type: 'Internal', location: 'Remote', w1: 0, w2: 0, w3: 0, w4: 0 }
            ]
        }));
    };

    const handleRemoveTeamMember = (index) => {
        setFormData(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.filter((_, i) => i !== index)
        }));
    };

    const handleTeamMemberChange = (index, field, value) => {
        const newTeam = [...formData.teamMembers];
        if (['w1', 'w2', 'w3', 'w4'].includes(field)) {
            newTeam[index][field] = parseInt(value) || 0;
        } else if (field === 'company_type') {
            newTeam[index][field] = value;
            if (value === 'Internal') {
                newTeam[index]['company'] = 'Cloud Destinations';
            } else {
                newTeam[index]['company'] = '';
            }
        } else {
            newTeam[index][field] = value;
        }
        setFormData({ ...formData, teamMembers: newTeam });
    };

    // --- Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const projectId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

        const payload = {
            project_id: projectId,
            project_name: formData.name,
            project_status: formData.status,
            billable: formData.billable,
            start_date: formData.startDate,
            end_date: formData.endDate || null,
            team_members: formData.teamMembers
        };

        try {
            await axios.post('/projects', payload);
            setIsSubmitting(false);
            if (onAdd) onAdd(payload);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to create project.");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Expansive Panel (Wider for the table) */}
            <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Add New Project</h2>
                        <p className="text-xs text-gray-500 mt-1">Configure project details and allocate team members</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    <form id="add-project-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-8">

                        {/* --- TOP SECTION: Project Details --- */}
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Building size={18} className="text-blue-500" />
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Project Details</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Project Name</label>
                                    <input type="text" name="name" placeholder="e.g. Enterprise Migration" required
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-800"
                                        value={formData.name} onChange={handleChange} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Type</label>
                                    <select name="type" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                        value={formData.type} onChange={handleChange}>
                                        <option value="Client">Client</option>
                                        <option value="Internal">Internal</option>
                                        <option value="Partner">Partner</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                                    <select name="status" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                        value={formData.status} onChange={handleChange}>
                                        <option value="Planned">Planned</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Delayed">Delayed</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Billable</label>
                                    <select name="billable"
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white cursor-pointer font-medium text-gray-700"
                                        value={formData.billable} onChange={handleChange}>
                                        <option value="Billable">Billable</option>
                                        <option value="Non - Billable">Non - Billable</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Start Date</label>
                                    <input type="date" name="startDate" required
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700"
                                        value={formData.startDate} onChange={handleChange} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">End Date</label>
                                    <input type="date" name="endDate"
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700"
                                        value={formData.endDate} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* --- BOTTOM SECTION: Team Members --- */}
                        <div className="flex flex-col gap-4 mb-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-emerald-500" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Team Members</h3>
                                </div>
                                <button type="button" onClick={handleAddTeamMember} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                                    <Plus size={14} /> Add Team Member
                                </button>
                            </div>

                            {formData.teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    No team members allocated to this project yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">S.No</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Name</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Role</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Comp. Type</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Company</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Location</th>
                                                <th className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">W1</th>
                                                <th className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">W2</th>
                                                <th className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">W3</th>
                                                <th className="px-2 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">W4</th>
                                                <th className="px-3 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.teamMembers.map((member, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 bg-white hover:bg-slate-50/40">
                                                    <td className="px-3 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                                                    <td className="px-2 py-2 min-w-[120px]">
                                                        <input type="text" value={member.name} onChange={(e) => handleTeamMemberChange(idx, 'name', e.target.value)} required placeholder="Name" className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[120px]">
                                                        <input type="text" value={member.role} onChange={(e) => handleTeamMemberChange(idx, 'role', e.target.value)} required placeholder="Role" className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[100px]">
                                                        <select value={member.company_type} onChange={(e) => handleTeamMemberChange(idx, 'company_type', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer font-semibold text-slate-600">
                                                            <option value="Internal">Internal</option>
                                                            <option value="Partner">Partner</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[130px]">
                                                        <input type="text" value={member.company} onChange={(e) => handleTeamMemberChange(idx, 'company', e.target.value)} disabled={member.company_type === 'Internal'} placeholder="Company Name" className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white disabled:bg-slate-50 disabled:text-slate-400" />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[90px]">
                                                        <select value={member.location} onChange={(e) => handleTeamMemberChange(idx, 'location', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer">
                                                            <option value="Remote">Remote</option>
                                                            <option value="On-Site">On-Site</option>
                                                            <option value="Hybrid">Hybrid</option>
                                                        </select>
                                                    </td>
                                                    {['w1', 'w2', 'w3', 'w4'].map((wCol) => (
                                                        <td key={wCol} className="px-1 py-2 min-w-[45px]">
                                                            <input type="number" min="0" max="168" value={member[wCol]} onChange={(e) => handleTeamMemberChange(idx, wCol, e.target.value)} className="w-full px-1 py-1.5 text-xs text-center border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-center">
                                                        <button type="button" onClick={() => handleRemoveTeamMember(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Remove">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                        Cancel
                    </button>
                    <button form="add-project-form" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</span>
                        ) : (
                            <><Save size={16} /> Create Project & Allocate</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default AddProjectPanel;
