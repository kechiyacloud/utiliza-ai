import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getEmployeeOfMonth } from '../../api/employeeApi';

const EmployeeMonthCard = ({ onClick }) => {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const data = await getEmployeeOfMonth();
                setEmployee(data);
            } catch (error) {
                console.error('Error fetching employee of the month:', error);
                setEmployee(null);

            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative min-w-[180px] h-full flex-1 hover:-translate-y-1 transition-transform duration-300" onClick={() => onClick && onClick(null)}>
                <div className="flex items-center justify-between w-full mb-4">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500">
                        <Trophy size={22} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col justify-end">
                    <p className="text-slate-500 text-xs font-semibold tracking-wide uppercase mb-1.5">Employee of the Month</p>
                    <p className="text-slate-400 text-sm font-bold">Loading...</p>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative min-w-[180px] h-full flex-1 hover:-translate-y-1 transition-transform duration-300" onClick={() => onClick && onClick(null)}>
                <div className="flex items-center justify-between w-full mb-4">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500">
                        <Trophy size={22} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col justify-end">
                    <p className="text-slate-500 text-xs font-semibold tracking-wide uppercase mb-1.5">Employee of the Month</p>
                    <p className="text-slate-400 text-sm font-bold">No results</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative min-w-[180px] h-full flex-1 cursor-pointer group hover:-translate-y-1 transition-transform duration-300 overflow-hidden" onClick={() => onClick && onClick(employee)}>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-purple-200"></div>

            <div className="flex items-center justify-between w-full mb-4 z-10">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:border-purple-200 transition-colors">
                    <Trophy size={22} strokeWidth={2.5} />
                </div>
                {employee.photo_url ? (
                    <img src={employee.photo_url} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-bold">
                        {employee.employee_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'N/A'}
                    </div>
                )}
            </div>

            <div className="relative z-10 flex flex-col justify-end flex-1">
                <p className="text-slate-500 text-xs font-semibold tracking-wide uppercase mb-1.5">Employee of the Month</p>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors truncate">{employee.employee_name}</h3>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{employee.role_designation}</p>
            </div>
        </div>
    );
};

export default EmployeeMonthCard;
