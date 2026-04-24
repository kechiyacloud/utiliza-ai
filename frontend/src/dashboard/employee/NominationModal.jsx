import React, { useState, useEffect } from 'react';
import { X, Trophy, MessageSquare, Send, User, ShieldCheck, UserCheck, Star, Loader2 } from 'lucide-react';
import { getEmployeeList, nominateEmployee } from '../../api/employeeApi';
import { useDataRefresh } from '../../context';

export default function NominationModal({ onClose, onSuccess }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { refreshKey } = useDataRefresh();
    const [selection, setSelection] = useState({
        employee_id: '',
        nominator_role: 'Leader',
        feedback_text: '',
        month: new Date().toISOString().split('-').slice(0, 2).join('-') // 'YYYY-MM'
    });

    useEffect(() => {
        async function load() {
            try {
                const data = await getEmployeeList(refreshKey > 0);
                setEmployees(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [refreshKey]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selection.employee_id || !selection.feedback_text) return;
        
        setSubmitting(true);
        try {
            await nominateEmployee(selection);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            alert("Failed to submit nomination: " + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Nominate for Employee of the Month</h2>
                            <p className="text-amber-100 text-sm mt-0.5">Recognize excellence and leadership</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Employee Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <User size={14} className="text-amber-500" /> Select Employee
                        </label>
                        <select 
                            required
                            value={selection.employee_id}
                            onChange={e => setSelection({...selection, employee_id: e.target.value})}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Choose an employee...</option>
                            {employees.map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                    {emp.employee_name} ({emp.employee_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-amber-500" /> Your Role
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Leader', 'PMO', 'Executive'].map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setSelection({...selection, nominator_role: role})}
                                    className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${
                                        selection.nominator_role === role 
                                        ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold' 
                                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                    }`}
                                >
                                    <span className="text-xs">{role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feedback Text */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-amber-500" /> Feedback / Reason
                        </label>
                        <textarea
                            required
                            value={selection.feedback_text}
                            onChange={e => setSelection({...selection, feedback_text: e.target.value})}
                            placeholder="Why does this employee deserve to be Employee of the Month?"
                            rows={4}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    {/* Info Note */}
                    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed">
                        <Star size={14} className="flex-shrink-0 text-blue-500" />
                        <p>Your feedback will be reviewed by the management committee. Valid for {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())}.</p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !selection.employee_id || !selection.feedback_text}
                            className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-amber-200 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] active:scale-100"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            {submitting ? 'Submitting...' : 'Submit Nomination'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
