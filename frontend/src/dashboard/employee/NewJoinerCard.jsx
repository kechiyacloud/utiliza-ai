import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { getNewJoiners } from '../../api/employeeApi';

const NewJoinerCard = ({ onClick }) => {
    const [joiners, setJoiners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJoiners = async () => {
            try {
                const data = await getNewJoiners();
                // Safety net: exclude notice period employees regardless of data source
                const filtered = (data || []).filter(e =>
                    (e.employee_status || '').toLowerCase() !== 'notice period'
                );
                setJoiners(filtered.length > 0 ? filtered : [
                    { employee_name: 'New Joiner', role_designation: 'Onboarding', photo_url: null }
                ]);
            } catch (error) {
                console.error('Error fetching new joiners:', error);
                setJoiners([]);
            } finally {
                setLoading(false);
            }
        };
        fetchJoiners();
    }, []);

    useEffect(() => {
        if (joiners.length <= 1) return; // Don't cycle if only one or none

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % joiners.length);
        }, 5000); // 5 seconds per slide
        return () => clearInterval(interval);
    }, [joiners.length]);

    if (loading) {
        return (
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between h-full">
                <div className="w-full">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">New Joiner</p>
                    <p className="text-xs text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    const joiner = joiners[currentIndex];

    return (
        <div
            className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md cursor-pointer group relative overflow-hidden h-full"
            onClick={onClick}
        >
            <div className="w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">New Joiner</p>

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
        </div>
    );
};

export default NewJoinerCard;
