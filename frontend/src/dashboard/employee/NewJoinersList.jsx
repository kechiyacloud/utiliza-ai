import React from 'react';
import { UserPlus, ChevronRight } from 'lucide-react';

const NewJoinersList = () => {
    // Mock Data
    const joiners = [
        { name: 'Sarah Wilson', role: 'UI Designer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
        { name: 'James Rodri', role: 'Developer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
        { name: 'Emily Chen', role: 'Product Owner', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026302d' },
        { name: 'Michael Brown', role: 'QA Engineer', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d' },
        { name: 'Lisa Taylor', role: 'HR', avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d' }
    ];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-800">New Joiners</h3>
                {/* <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <UserPlus size={18} />
                </div> */}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {joiners.map((joiner, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                        <img
                            src={joiner.avatar}
                            alt={joiner.name}
                            className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-800 truncate group-hover:text-blue-600 transition-colors">{joiner.name}</h4>
                            <p className="text-xs text-gray-500 truncate">{joiner.role}</p>
                        </div>
                        <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NewJoinersList;
