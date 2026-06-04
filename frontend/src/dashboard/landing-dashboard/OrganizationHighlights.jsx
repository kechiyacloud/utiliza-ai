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
    UserPlus,
    AlertCircle,
    Search,
    X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const OrganizationHighlights = ({
    availability = [],
    transitions = [],
    certifications = [],
    benchAging = [],
    highUtilizationEmployee = [],
    highUtilizationProject = [],
    contextLabel = 'Organization',
    activeTabOverride = null
}) => {
    const [activeTab, setActiveTab] = useState('Over Allocated');
    const [utilizationSubTab, setUtilizationSubTab] = useState('EMPLOYEE');
    const [releaseSearch, setReleaseSearch] = useState('');

    useEffect(() => {
        if (activeTabOverride) {
            setActiveTab(activeTabOverride);
        }
    }, [activeTabOverride]);
    const navigate = useNavigate();
    const location = useLocation();

    const filteredAvailability = useMemo(() => {
        if (!releaseSearch) return availability;
        const query = releaseSearch.toLowerCase().trim();
        return availability.filter(item => 
            (item.name || '').toLowerCase().includes(query) ||
            (item.project || '').toLowerCase().includes(query) ||
            (item.role || '').toLowerCase().includes(query)
        );
    }, [availability, releaseSearch]);

    const movementStats = useMemo(() => {
        if (!transitions.length) return null;
        const total = transitions.length;
        const entries = transitions.filter(t => t.type === 'Project Entry' || t.type === 'New Assignment').length;
        const exits = transitions.filter(t => t.type === 'Exit').length;
        const transfers = transitions.filter(t => t.type === 'Transfer').length;
        const notice = transitions.filter(t => t.type === 'Notice').length;
        return { total, entries, exits, transfers, notice };
    }, [transitions]);

    const tabs = [
        { id: 'Upcoming Releases', label: 'Upcoming Releases', icon: Calendar },
        { id: 'Over Allocated', label: 'Over Allocated', icon: Zap },
        { id: 'Recent Movements', label: 'Recent Movements', icon: Activity },
        { id: 'Bench Aging', label: 'Bench Aging', icon: Clock },
        { id: 'Certificates', label: 'Certificates', icon: Award },
    ];

    const getSubtitle = () => {
        switch (activeTab) {
            case 'Upcoming Releases':
                return 'Resources nearing project completion and roll-off';
            case 'Over Allocated':
                return 'Employees and projects with the highest resource allocation';
            case 'Recent Movements':
                return 'Latest resource transitions between projects';
            case 'Bench Aging':
                return 'Resources on bench tracked by duration';
            case 'Certificates':
                return 'Upcoming certification expiries and achievements';
            default:
                return '';
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Over Allocated':
                return renderOverAllocated();
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

    const renderOverAllocated = () => {
        const data = utilizationSubTab === 'EMPLOYEE'
            ? highUtilizationEmployee.filter(item => (item.allocation || 0) > 100)
            : highUtilizationProject;

        return (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-2 mb-1">
                    <button
                        onClick={() => setUtilizationSubTab('EMPLOYEE')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${utilizationSubTab === 'EMPLOYEE' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        EMPLOYEE
                    </button>
                    <button
                        onClick={() => setUtilizationSubTab('PROJECTS')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${utilizationSubTab === 'PROJECTS' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        PROJECTS
                    </button>
                </div>

                <div className="space-y-2">
                    {data.length > 0 ? data.slice(0, 5).map((item, idx) => (
                        <div
                            key={idx}
                            className={`group relative ${((utilizationSubTab === 'EMPLOYEE' && item.id) || (utilizationSubTab === 'PROJECTS' && item.id)) && item.id !== '0' ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                                if (item.id && item.id !== '0') {
                                    if (utilizationSubTab === 'EMPLOYEE') {
                                        navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } });
                                    } else {
                                        navigate(`/info/projects/${item.id}`, { state: { from: 'highlights' } });
                                    }
                                }
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-300 w-4">#{idx + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <h4 className="text-sm font-medium text-slate-700 tracking-tight group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold flex items-center gap-1.5 ${
                                                utilizationSubTab === 'EMPLOYEE'
                                                    ? item.allocation > 100
                                                        ? 'text-rose-600 animate-pulse'
                                                        : item.allocation >= 70
                                                            ? 'text-emerald-600 font-semibold'
                                                            : 'text-blue-600'
                                                    : 'text-blue-600'
                                            }`}>
                                                {utilizationSubTab === 'EMPLOYEE' && item.allocation > 100 && (
                                                    <AlertCircle size={12} className="text-rose-500" />
                                                )}
                                                {utilizationSubTab === 'EMPLOYEE' ? `${item.allocation}%` : `${item.resource_count} Resources`}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right truncate">
                                                {utilizationSubTab === 'EMPLOYEE' ? (item.role || 'Specialist') : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                                utilizationSubTab === 'EMPLOYEE'
                                                    ? item.allocation > 100
                                                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                                        : item.allocation >= 70
                                                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                                            : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                                                    : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                                            }`}
                                            style={{ width: `${utilizationSubTab === 'EMPLOYEE' ? item.allocation : Math.min(100, (item.resource_count * 10))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                            No allocation data available
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUpcomingReleases = () => {
        return (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Search Bar Row */}
                <div className="flex justify-end mb-1">
                    <div className="relative w-full max-w-[240px] flex items-center">
                        <Search size={12} className="absolute left-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search releases by name, project, role..."
                            value={releaseSearch}
                            onChange={(e) => setReleaseSearch(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-lg pl-7 pr-7 py-1 text-[10px] text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner"
                        />
                        {releaseSearch && (
                            <button
                                onClick={() => setReleaseSearch('')}
                                className="absolute right-2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredAvailability.length > 0 ? filteredAvailability.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-2 rounded-xl border border-slate-50 hover:border-blue-100 hover:shadow-sm transition-all group flex items-center gap-2 bg-white ${item.id && item.id !== '0' ? 'cursor-pointer' : ''}`}
                            onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <h5
                                        className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.id && item.id !== '0') {
                                                navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } });
                                            }
                                        }}
                                    >
                                        {item.name}
                                    </h5>
                                    {item.role && (
                                        <span className="text-[7.5px] font-black uppercase tracking-wider px-1 bg-slate-50 text-slate-500 rounded border border-slate-100/50 truncate max-w-[90px]" title={item.role}>
                                            {item.role}
                                        </span>
                                    )}
                                </div>
                                <p
                                    className="text-[10px] text-slate-500 font-medium hover:text-blue-600 cursor-pointer truncate"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.project_id) {
                                            navigate(`/info/projects/${item.project_id}`, { state: { from: 'highlights' } });
                                        }
                                    }}
                                >
                                    {item.project}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">Roll-off</p>
                                <p className="text-[10px] font-bold text-slate-400">{item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            {releaseSearch ? "No matching releases found" : "No upcoming releases"}
                        </div>
                    )}
                </div>
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
                return 'bg-sky-50 text-sky-600 border-sky-100';
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
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {movementStats && (
                    <div className="flex gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{movementStats.total} Total</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200 self-center"></div>
                        <div className="flex items-center gap-1.5">
                            <UserPlus size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{movementStats.entries} Entries</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200 self-center"></div>
                        <div className="flex items-center gap-1.5">
                            <UserMinus size={12} className="text-rose-500" />
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{movementStats.exits} Exits</span>
                        </div>
                        {movementStats.transfers > 0 && (
                            <>
                                <div className="w-px h-3 bg-slate-200 self-center"></div>
                                <div className="flex items-center gap-1.5">
                                    <ArrowRight size={12} className="text-indigo-500" />
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{movementStats.transfers} Transfers</span>
                                </div>
                            </>
                        )}
                        {movementStats.notice > 0 && (
                            <>
                                <div className="w-px h-3 bg-slate-200 self-center"></div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-orange-500" />
                                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">{movementStats.notice} Notice</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    {transitions.length > 0 ? transitions.map((item, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/50 transition-all duration-300 ${item.id && item.id !== '0' ? 'cursor-pointer group' : ''}`}
                            onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                        >
                            <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 transition-colors ${item.type === 'Exit' ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : item.type === 'Notice' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                                {item.type === 'Exit' ? <UserMinus size={16} /> : item.type === 'New Assignment' || item.type === 'Project Entry' ? <UserPlus size={16} /> : <Activity size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <h5 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.employee}</h5>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            {item.date ? (
                                                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            ) : (
                                                <span className="text-orange-600 font-black">Current</span>
                                            )}
                                        </div>
                                        {item.type && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${getMovementBadgeStyles(item.type)}`}>
                                                {item.type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50/80 p-2 rounded-xl border border-slate-100 group-hover:bg-slate-50 group-hover:border-indigo-100 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">From</p>
                                        <p className="text-[11px] font-bold text-slate-600 truncate">{item.from_project || item.fromProject || 'Bench'}</p>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-100 shadow-sm">
                                        <ArrowRight size={12} className="text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-right">
                                        <p className="text-[9px] text-indigo-400 font-black uppercase mb-0.5">To</p>
                                        <p className="text-[11px] font-bold text-indigo-600 truncate">{item.to_project || item.toProject}</p>
                                    </div>
                                </div>
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

    const getExpiryStyles = (expiryDateStr) => {
        if (!expiryDateStr) return { text: 'text-slate-400 bg-slate-50 border-slate-100', label: '', showDot: false };
        try {
            const expiryDate = new Date(expiryDateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expiryDate.setHours(0, 0, 0, 0);

            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                return { text: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Expired', showDot: true };
            } else if (diffDays < 30) {
                return { text: 'text-rose-600 bg-rose-50 border-rose-100', label: `${diffDays}d left`, showDot: true };
            } else if (diffDays <= 90) {
                return { text: 'text-amber-600 bg-amber-50 border-amber-100', label: `${diffDays}d left`, showDot: false };
            } else {
                return { text: 'text-teal-600 bg-teal-50 border-teal-100/50', label: `${diffDays}d left`, showDot: false };
            }
        } catch (e) {
            return { text: 'text-slate-400 bg-slate-50 border-slate-100', label: expiryDateStr, showDot: false };
        }
    };

    const renderBenchAging = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {benchAging.length > 0 ? benchAging.map((item, idx) => {
                    const days = item.days_in_year || 0;
                    let cardBorderClass = 'hover:border-slate-200';
                    let textHoverClass = 'group-hover:text-slate-600';
                    let badgeClass = 'bg-slate-50 text-slate-500 border border-slate-100/50';
                    let barClass = 'bg-slate-400';

                    if (days > 60) {
                        cardBorderClass = 'hover:border-rose-200 hover:bg-rose-50/10';
                        textHoverClass = 'group-hover:text-rose-600';
                        badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        barClass = 'bg-rose-600';
                    } else if (days > 30) {
                        cardBorderClass = 'hover:border-amber-200 hover:bg-amber-50/10';
                        textHoverClass = 'group-hover:text-amber-600';
                        badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                        barClass = 'bg-amber-500';
                    }

                    return (
                        <div
                            key={idx}
                            className={`p-2 rounded-xl border border-slate-50 bg-white transition-all ${
                                item.id && item.id !== '0' ? `cursor-pointer group ${cardBorderClass}` : ''
                            }`}
                            onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                        >
                            <div className="flex justify-between items-start mb-1.5">
                                <h5 className={`text-xs font-medium text-slate-800 truncate w-2/3 transition-colors ${textHoverClass}`}>
                                    {item.name}
                                </h5>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
                                    {days} Days
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                                    style={{ width: `${Math.min(100, (days / 120) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        No resources on bench
                    </div>
                )}
            </div>
        );
    };

    const renderCertificates = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {certifications.length > 0 ? certifications.map((item, idx) => (
                    <div
                        key={idx}
                        className={`p-2 rounded-xl bg-teal-50/30 border border-teal-50 hover:bg-white hover:shadow-md transition-all group relative min-h-[85px] ${item.id && item.id !== '0' ? 'cursor-pointer' : ''}`}
                        onClick={() => item.id && item.id !== '0' && navigate(`/info/employee/${item.id}`, { state: { from: 'highlights' } })}
                    >
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-teal-600 shadow-sm flex-shrink-0">
                                <Award size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-medium text-slate-800 truncate mb-1 group-hover:text-teal-600">{item.employee}</h5>

                                <div className="space-y-1 mt-1">
                                    {(item.certs || []).slice(0, 2).map((cert, cIdx) => {
                                        const styles = getExpiryStyles(cert.expiry);
                                        return (
                                            <div key={cIdx} className="flex justify-between items-center gap-2">
                                                <p className="text-[10px] font-semibold text-slate-600 truncate leading-tight flex-1" title={cert.name}>
                                                    {cert.name}
                                                </p>
                                                {cert.expiry && (
                                                    <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 border ${styles.text}`}>
                                                        {styles.showDot && (
                                                            <span className="w-1 h-1 rounded-full bg-rose-600"></span>
                                                        )}
                                                        {styles.label}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {item.count > 2 && (
                                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-[10px] font-bold text-teal-700 uppercase">
                                            +{item.count - 2} More Certificates
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No upcoming expiries
                    </div>
                )}

                {activeTab === 'Certificates' && certifications.length >= 12 && (
                    <div className="col-span-full mt-4 flex justify-center">
                        <button
                            onClick={() => navigate('/info/view-resources?type=certifications', { state: { from: 'highlights' } })}
                            className="flex items-center gap-2 px-6 py-2 bg-teal-50 text-teal-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100/50"
                        >
                            View All Certifications
                            <ArrowRight size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full bg-white rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 p-4 lg:p-5" id="dashboard-operational-highlights" ref={highlightsRef}>
            {/* Header with Nav */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-gray-800">
                            Organization Highlights
                        </h2>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        {getSubtitle()}
                    </p>
                </div>

                <div className="flex flex-wrap items-center bg-[#F8FAFC] p-1 rounded-2xl gap-0.5 border border-slate-50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">
                        Immediate Action Required
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OrganizationHighlights;
