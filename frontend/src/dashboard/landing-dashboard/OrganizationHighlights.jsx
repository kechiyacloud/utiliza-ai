import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Calendar,
    Zap,
    Activity,
    Clock,
    Award,
    ChevronRight,
    ArrowRight,
    TrendingUp,
    UserMinus,
    UserPlus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const OrganizationHighlights = ({
    availability = [],
    transitions = [],
    certifications = [],
    benchAging = [],
    highUtilizationEmployee = [],
    highUtilizationProject = [],
    contextLabel = 'Organization'
}) => {
    const [activeTab, setActiveTab] = useState('Top Utilization');
    const [utilizationSubTab, setUtilizationSubTab] = useState('EMPLOYEE');
    const navigate = useNavigate();
    const location = useLocation();

    const movementStats = useMemo(() => {
        if (!transitions.length) return null;
        const total = transitions.length;
        const entries = transitions.filter(t => t.type === 'Project Entry' || t.type === 'New Assignment').length;
        const exits = transitions.filter(t => t.type === 'Exit').length;
        return { total, entries, exits };
    }, [transitions]);

    const tabs = [
        { id: 'Upcoming Releases', label: 'Upcoming Releases', icon: Calendar },
        { id: 'Top Utilization', label: 'Top Utilization', icon: Zap },
        { id: 'Recent Movements', label: 'Recent Movements', icon: Activity },
        { id: 'Bench Aging', label: 'Bench Aging', icon: Clock },
        { id: 'Certificates', label: 'Certificates', icon: Award },
    ];

    const getSubtitle = () => {
        switch (activeTab) {
            case 'Upcoming Releases':
                return 'RESOURCES NEARING PROJECT COMPLETION AND ROLL-OFF';
            case 'Top Utilization':
                return 'EMPLOYEE AND PROJECTS WITH THE HIGHEST RESOURCE ALLOCATION';
            case 'Recent Movements':
                return 'LATEST RESOURCE TRANSITIONS BETWEEN PROJECTS';
            case 'Bench Aging':
                return 'RESOURCES ON BENCH TRACKED BY DURATION';
            case 'Certificates':
                return 'UPCOMING CERTIFICATION EXPIRIES AND ACHIEVEMENTS';
            default:
                return '';
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Top Utilization':
                return renderTopUtilization();
            case 'Upcoming Releases':
                return renderUpcomingReleases();
            case 'Recent Movements':
                return renderRecentMovements();
            case 'Bench Aging':
                return renderBenchAging();
            case 'Certificates':
                return renderCertificates();
            default:
                return null;
        }
    };

    const highlightsRef = useRef(null);

    useEffect(() => {
        if (location.state?.from === 'highlights' && highlightsRef.current) {
            setTimeout(() => {
                highlightsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [location.state, highlightsRef]);

    const renderTopUtilization = () => {
        const data = utilizationSubTab === 'EMPLOYEE' ? highUtilizationEmployee : highUtilizationProject;
        
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-4 mb-2">
                    <button 
                        onClick={() => setUtilizationSubTab('EMPLOYEE')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${utilizationSubTab === 'EMPLOYEE' ? 'bg-[#FFF8E7] text-[#D97706]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        EMPLOYEE
                    </button>
                    <button 
                        onClick={() => setUtilizationSubTab('PROJECTS')}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${utilizationSubTab === 'PROJECTS' ? 'bg-[#FFF8E7] text-[#D97706]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        PROJECTS
                    </button>
                </div>

                <div className="space-y-4">
                    {data.length > 0 ? data.slice(0, 5).map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`group relative ${utilizationSubTab === 'EMPLOYEE' && item.id && item.id !== '0' ? 'cursor-pointer' : ''}`}
                            onClick={() => utilizationSubTab === 'EMPLOYEE' && item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-bold text-slate-300 w-4">#{idx + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-[#D97706]">
                                                {utilizationSubTab === 'EMPLOYEE' ? `${item.allocation}%` : `${item.resource_count} Resources`}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right truncate">
                                                {utilizationSubTab === 'EMPLOYEE' ? (item.role || 'Specialist') : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#F59E0B] rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(245,158,11,0.2)]" 
                                            style={{ width: `${utilizationSubTab === 'EMPLOYEE' ? item.allocation : Math.min(100, (item.resource_count * 10))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            No utilization data available
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUpcomingReleases = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {availability.length > 0 ? availability.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`p-3 rounded-xl border border-slate-50 hover:border-blue-100 hover:shadow-sm transition-all group flex items-center gap-3 bg-white ${item.id && item.id !== '0' ? 'cursor-pointer' : ''}`}
                        onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                            {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="text-[10px] font-black text-slate-800 uppercase truncate group-hover:text-blue-600">{item.name}</h5>
                            <p className="text-[8px] text-slate-500 font-medium">{item.project}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-blue-600 uppercase">Roll-off</p>
                            <p className="text-[8px] font-bold text-slate-400">{item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}</p>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        No upcoming releases
                    </div>
                )}
            </div>
        );
    };

    const getMovementBadgeStyles = (type) => {
        switch (type) {
            case 'New Assignment':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Project Entry':
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Roll-off':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Exit':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'Notice':
                return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'Transfer':
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const renderRecentMovements = () => {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {movementStats && (
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={12} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{movementStats.total} Total Movements</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200 self-center"></div>
                        <div className="flex items-center gap-2">
                            <UserPlus size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">{movementStats.entries} Entries</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200 self-center"></div>
                        <div className="flex items-center gap-2">
                            <UserMinus size={12} className="text-rose-500" />
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider">{movementStats.exits} Exits</span>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {transitions.length > 0 ? transitions.map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:shadow-sm transition-all ${item.id && item.id !== '0' ? 'cursor-pointer group' : ''}`}
                            onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                        >
                            <div className={`p-1.5 rounded-lg ${item.type === 'Exit' ? 'bg-rose-100 text-rose-600' : item.type === 'Notice' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                <Activity size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h5 className="text-[10px] font-black text-slate-800 uppercase truncate group-hover:text-indigo-600">{item.employee}</h5>
                                    {item.type && (
                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${getMovementBadgeStyles(item.type)}`}>
                                            {item.type}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[80px]">{item.from_project || item.fromProject || 'Bench'}</span>
                                    <ArrowRight size={10} className="text-slate-300 flex-shrink-0" />
                                    <span className="text-[8px] font-bold text-indigo-600 uppercase truncate max-w-[120px]">{item.to_project || item.toProject}</span>
                                </div>
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                                {item.date ? (
                                    new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                        <div className="w-1 h-1 rounded-full bg-slate-400 animate-pulse"></div>
                                        <span>Current</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            No recent movements
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderBenchAging = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {benchAging.length > 0 ? benchAging.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`p-3 rounded-xl border border-slate-50 bg-white hover:border-rose-100 transition-all ${item.id && item.id !== '0' ? 'cursor-pointer group' : ''}`}
                        onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                    >
                        <div className="flex justify-between items-start mb-1.5">
                            <h5 className="text-[10px] font-black text-slate-800 uppercase truncate w-2/3 group-hover:text-rose-600">{item.name}</h5>
                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.days_in_year > 30 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                                {item.days_in_year} Days
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${item.days_in_year > 30 ? 'bg-rose-500' : 'bg-slate-300'}`}
                                style={{ width: `${Math.min(100, (item.days_in_year / 120) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        No resources on bench
                    </div>
                )}
            </div>
        );
    };

    const renderCertificates = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {certifications.length > 0 ? certifications.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`p-3 rounded-xl bg-teal-50/30 border border-teal-50 hover:bg-white hover:shadow-md transition-all group relative min-h-[85px] ${item.id && item.id !== '0' ? 'cursor-pointer' : ''}`}
                        onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                    >
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-teal-600 shadow-sm flex-shrink-0">
                                <Award size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-[10px] font-black text-slate-800 uppercase truncate mb-1 group-hover:text-teal-600">{item.employee}</h5>
                                
                                <div className="space-y-1">
                                    {(item.certs || []).slice(0, 2).map((cert, cIdx) => (
                                        <div key={cIdx}>
                                            <p className="text-[8px] font-bold text-teal-600 truncate leading-tight" title={cert.name}>
                                                {cert.name}
                                            </p>
                                        </div>
                                    ))}
                                    
                                    {item.count > 2 && (
                                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-[7px] font-black text-teal-700 uppercase">
                                            +{item.count - 2} More Certificates
                                        </div>
                                    )}
                                </div>

                                {/* Full list on hover */}
                                {item.count > 2 && (
                                    <div 
                                        className="absolute left-0 right-0 top-full mt-1 p-3 bg-white border border-teal-100 rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Complete Certification List</p>
                                        <div className="space-y-1.5">
                                            {(item.certs || []).map((cert, cIdx) => (
                                                <div key={cIdx} className="flex justify-between items-center gap-4">
                                                    <p className="text-[8px] font-bold text-teal-700">{cert.name}</p>
                                                    <p className="text-[7px] font-medium text-slate-400 whitespace-nowrap">
                                                        {cert.expiry ? new Date(cert.expiry).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        No upcoming expiries
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full bg-white rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 p-6 lg:p-7" id="dashboard-operational-highlights" ref={highlightsRef}>
            {/* Header with Nav */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            Organization Highlights
                        </h2>
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {getSubtitle()}
                    </p>
                </div>

                <div className="flex flex-wrap items-center bg-[#F8FAFC] p-1 rounded-2xl gap-0.5 border border-slate-50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-white text-[#D97706] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <tab.icon size={12} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area - Made scrollable for "View All" requirement */}
            <div className="min-h-[280px] max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {renderContent()}
            </div>
            
            {/* Subtle bottom detail */}
            <div className="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        Immediate Action Required
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OrganizationHighlights;
