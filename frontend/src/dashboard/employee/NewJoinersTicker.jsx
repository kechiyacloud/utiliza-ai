import React from 'react';
import { UserPlus, Sparkles } from 'lucide-react';

const NewJoinersTicker = () => {
    // Mock Data for New Joiners
    // Duplicating the list to ensure smooth infinite scroll (4 sets to cover wide screens)
    const baseJoiners = [
        { name: 'Sarah Wilson', role: 'UI Designer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
        { name: 'James Rodri', role: 'Developer', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
        { name: 'Emily Chen', role: 'Product Owner', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026302d' },
        { name: 'Michael Brown', role: 'QA Engineer', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d' },
        { name: 'Lisa Taylor', role: 'HR', avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d' }
    ];

    const joiners = [...baseJoiners, ...baseJoiners, ...baseJoiners, ...baseJoiners];

    return (
        <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm h-14 flex items-center overflow-hidden relative mb-6 group">

            {/* 1. Static Label "Badges" */}
            <div className="flex items-center gap-2 px-4 h-full bg-blue-50 z-20 shadow-[4px_0_12px_rgba(0,0,0,0.05)] flex-shrink-0">
                <div className="p-1.5 bg-blue-500 rounded-lg text-white animate-pulse">
                    <Sparkles size={16} fill="currentColor" />
                </div>
                <div>
                    <h3 className="text-sm font-extrabold text-blue-900 leading-tight">New Joiners</h3>
                    <p className="text-[10px] font-medium text-blue-600 uppercase tracking-widest">Welcome Aboard</p>
                </div>
                {/* Arrow/Decorator to blend into ticker */}
                <div className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-blue-50 border-b-[8px] border-b-transparent"></div>
            </div>

            {/* 2. Scrolling Content Container */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center mask-linear-fade">
                {/* 
                    Track: The element that moves. 
                    - hover:pause-scroll to stop animation on interaction
                */}
                <div className="flex items-center gap-6 animate-scroll whitespace-nowrap pl-4 group-hover:[animation-play-state:paused] cursor-pointer">
                    {joiners.map((joiner, index) => (
                        <div key={index} className="flex items-center gap-3 bg-gray-50/50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-full py-1.5 pl-1.5 pr-4 transition-all duration-300 group/item">
                            <img
                                src={joiner.avatar}
                                alt={joiner.name}
                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover"
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-700 group-hover/item:text-blue-700 transition-colors">{joiner.name}</span>
                                <span className="text-[10px] text-gray-500 font-medium">{joiner.role}</span>
                            </div>
                        </div>
                    ))}
                    {/* Seamless text separator or icon can be added here if needed between sets */}
                </div>
            </div>

            {/* Gradient Overlay for smooth fade out on right */}
            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        </div>
    );
};

export default NewJoinersTicker;
