import React from 'react';
import { Trophy } from 'lucide-react';

const EmployeeMonthCard = ({ employee, onClick, selectedDepartment = 'Overall' }) => {
    if (!employee) {
        return (
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-start relative min-w-[140px] h-full flex-1">
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400 mb-2">
                    <Trophy size={18} />
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">No Performer</p>
                <p className="text-[9px] text-slate-300 font-medium mt-1">
                    {selectedDepartment === 'Overall' ? 'No allocated employee found' : `No allocated employee in ${selectedDepartment}`}
                </p>
            </div>
        );
    }

    return (
        <div
            className="bg-white p-3 rounded-2xl shadow-sm border border-purple-100 flex flex-col items-start relative min-w-[140px] h-full flex-1 cursor-pointer group hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
            onClick={() => onClick && onClick(employee)}
        >
            <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-purple-100"></div>

            <div className="flex w-full items-start justify-between z-10 mb-2">
                <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600 transition-colors">
                    <Trophy size={18} strokeWidth={2.5} />
                </div>
                {employee.photo_url ? (
                    <img src={employee.photo_url} alt="Profile" className="w-7 h-7 rounded-full border border-white shadow-sm object-cover" />
                ) : (
                    <div className="w-7 h-7 rounded-full border border-white shadow-sm bg-purple-100 flex items-center justify-center text-purple-700 text-[8px] font-black">
                        {employee.employee_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'IA'}
                    </div>
                )}
            </div>

            <div className="relative z-10 flex flex-col justify-end flex-1 w-full text-left">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1 truncate max-w-full">{employee.employee_name}</h3>
                <p className="text-slate-500 text-[9px] font-bold tracking-wider uppercase mb-0.5 whitespace-nowrap">Employee of the Month</p>
                <p className="text-[9px] text-slate-400 font-medium truncate">{employee.role_designation}</p>
                <p className="text-[9px] text-purple-500 font-bold mt-1 truncate">
                    {employee.employee_allocations ?? 0}% allocation
                </p>
            </div>
        </div>
    );
};

export default EmployeeMonthCard;
