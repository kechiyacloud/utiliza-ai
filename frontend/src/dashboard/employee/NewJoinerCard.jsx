import React, { useState, useEffect } from 'react';
import { UserSearch } from 'lucide-react';

const NewJoinerCard = ({ onClick, isActive, employees = [] }) => {
    const [joiners, setJoiners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

        const filtered = (employees || []).filter((employee) => {
            const joinDate = employee.date_of_joining ? new Date(employee.date_of_joining) : null;
            if (!joinDate || Number.isNaN(joinDate.getTime())) return false;

            return joinDate >= ninetyDaysAgo && (employee.employee_status || '').toLowerCase() !== 'notice period';
        });

        setJoiners(filtered);
        setCurrentIndex(0);
    }, [employees]);

    useEffect(() => {
        if (joiners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % joiners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [joiners.length]);

    if (joiners.length === 0) {
        return (
            <div 
                className={`bg-white p-3 rounded-xl shadow-md border flex items-center justify-between h-full cursor-pointer ${isActive ? 'border-blue-400 ring-2 ring-blue-100 ring-offset-1' : 'border-gray-100'}`}
                onClick={onClick}
            >
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">NEW JOINER</p>
                    <h3 className="font-extrabold text-sm text-gray-800 mt-1">No results</h3>
                </div>
                <div className="p-2 rounded-lg bg-slate-400 bg-opacity-10">
                    <UserSearch size={20} className="text-slate-500" />
                </div>
            </div>
        );
    }

    const joiner = joiners[currentIndex];

    return (
        <div
            className={`bg-white p-3 rounded-xl shadow-md border flex items-center justify-between transition-all hover:shadow-lg cursor-pointer group relative overflow-hidden h-full ${isActive ? 'border-blue-400 ring-2 ring-blue-100 ring-offset-1' : 'border-gray-100'}`}
            onClick={onClick}
        >
            <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">NEW JOINER</p>

                <div key={currentIndex} className="flex items-center gap-2 animate-fade-in">
                    {joiner.photo_url ? (
                        <img
                            src={joiner.photo_url}
                            alt={joiner.employee_name}
                            className="w-8 h-8 rounded-full border-2 border-green-100 object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-green-100 bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0">
                            {joiner.employee_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'N/A'}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-extrabold text-gray-800 truncate group-hover:text-green-600 transition-colors">{joiner.employee_name}</h3>
                        <p className="text-[9px] text-gray-500 font-medium truncate">{joiner.role_designation}</p>
                    </div>
                </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-400 bg-opacity-10 flex-shrink-0">
                <Users size={20} className="text-slate-500" />
            </div>
        </div>
    );
};

export default NewJoinerCard;
