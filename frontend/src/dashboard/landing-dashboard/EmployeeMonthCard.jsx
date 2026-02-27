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
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer min-w-[180px] flex-1 hover:shadow-md transition-shadow" onClick={() => onClick && onClick(null)}>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Employee of the Month</p>
                    <p className="text-xs text-gray-400">Loading...</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50">
                    <Trophy size={20} className="text-purple-500" />
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer min-w-[180px] flex-1 hover:shadow-md transition-shadow" onClick={() => onClick && onClick(null)}>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Employee of the Month</p>
                    <p className="text-xs text-gray-500 font-medium">No results</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50">
                    <Trophy size={20} className="text-purple-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md cursor-pointer group min-w-[180px] flex-1" onClick={() => onClick && onClick(employee)}>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Employee of the Month</p>
                <div className="flex items-center gap-2">
                    {employee.photo_url ? (
                        <img src={employee.photo_url} alt="Profile" className="w-8 h-8 rounded-full border-2 border-purple-100 object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-purple-100 bg-purple-50 flex items-center justify-center text-purple-600 text-xs font-bold">
                            {employee.employee_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'N/A'}
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-extrabold text-gray-800 group-hover:text-purple-600 transition-colors">{employee.employee_name}</h3>
                        <p className="text-[9px] text-gray-500 font-medium">{employee.role_designation}</p>
                    </div>
                </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 bg-opacity-50 group-hover:bg-purple-100 transition-colors">
                <Trophy size={20} className="text-purple-500" />
            </div>
        </div>
    );
};

export default EmployeeMonthCard;
