import React from 'react';
import { X, Users, Briefcase, Building2, User } from 'lucide-react';

const WorkforceSplitView = ({ isOpen, onClose, employees }) => {
  if (!isOpen) return null;

  const bench = employees.filter(e => (e.employee_status || '').toLowerCase() === 'bench');
  const allocated = employees.filter(e => (e.billable || '').toLowerCase() === 'billable');
  const internal = employees.filter(e => 
    (e.billable || '').toLowerCase() === 'non-billable' && 
    (e.employee_status || '').toLowerCase() !== 'bench' &&
    !(e.employee_status || '').toLowerCase().includes('notice')
  );

  const EmployeeList = ({ title, list, icon: Icon, colorClass, bgClass }) => (
    <div className="flex-1 min-w-[300px] flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b border-gray-50 ${bgClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
            <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
          </div>
          <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colorClass} bg-white border border-current opacity-80`}>
          {list.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {list.length > 0 ? (
          <div className="space-y-1">
            {list.map((emp, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-200 uppercase">
                  {emp.employee_name ? emp.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">{emp.employee_name}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{emp.role_designation || emp.designation || 'Specialist'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300">
            <User size={32} className="opacity-20 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">No employees found</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Users className="text-blue-500" />
              Workforce Allocation Details
            </h2>
            <p className="text-sm text-slate-500 font-medium">Categorized view of current workforce status and assignment</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Triple Column Grid */}
        <div className="flex-1 overflow-x-auto p-8">
          <div className="flex flex-col lg:flex-row gap-6 h-full min-w-min">
            <EmployeeList 
              title="Bench Employee" 
              list={bench} 
              icon={Users} 
              colorClass="bg-amber-500 text-amber-500" 
              bgClass="bg-amber-50/50"
            />
            <EmployeeList 
              title="Allocated Employee" 
              list={allocated} 
              icon={Briefcase} 
              colorClass="bg-blue-500 text-blue-500" 
              bgClass="bg-blue-50/50"
            />
            <EmployeeList 
              title="Internal / Non-Billable" 
              list={internal} 
              icon={Building2} 
              colorClass="bg-emerald-500 text-emerald-500" 
              bgClass="bg-emerald-50/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkforceSplitView;
