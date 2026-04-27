import React from 'react';
import { Users, Briefcase, Layers, Coffee, Percent, AlertCircle } from 'lucide-react';

const MetricCard = ({ label, value, subtext, icon: Icon, isAlert, isHighlighted, onClick }) => (
    <div
        className={`bg-white rounded-xl p-3.5 border transition-all duration-500 ${isHighlighted ? 'ring-4 ring-red-400 border-red-500 scale-105 shadow-xl z-10' : (isAlert ? 'border-red-100 bg-red-50/30' : 'border-gray-100')} shadow-sm flex flex-col justify-between h-24 ${onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}`}
        onClick={onClick}
    >
        <div className="flex justify-between items-start">
            <div className={`p-1.5 rounded-lg ${isHighlighted || isAlert ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <Icon size={16} />
            </div>
            {(isAlert || isHighlighted) && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
        </div>
        <div>
            <div className={`text-xl font-extrabold ${isHighlighted || isAlert ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
            {onClick && <div className="text-[9px] text-red-400 font-semibold mt-0.5">Click to view →</div>}
        </div>
    </div>
);

const AllocationMetrics = ({ metrics, highlightTag, onOverallocatedClick }) => {
    if (!metrics) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            <MetricCard label="Total Resources" value={metrics.totalResources.value} icon={Users} />
            <MetricCard label="Billable Count" value={metrics.billable.value} icon={Briefcase} />
            <MetricCard label="Non-Billable" value={metrics.nonBillable.value} icon={Layers} />
            <MetricCard label="Bench Strength" value={metrics.benchStrength.value} icon={Coffee} />
            <MetricCard label="Avg Utilization" value={metrics.avgUtilization.value} icon={Percent} />
            <MetricCard label="Overallocated" value={metrics.overallocated.value} icon={AlertCircle} isAlert={true} isHighlighted={highlightTag === 'overallocated'} onClick={onOverallocatedClick} />
        </div>
    );
};



export default AllocationMetrics;
