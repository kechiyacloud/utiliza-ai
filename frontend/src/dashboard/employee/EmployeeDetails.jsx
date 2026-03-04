import React, { useState, useEffect } from 'react'
import {
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    Briefcase,
    Users,
    ArrowLeft,
    ChevronRight,
    ChevronLeft,
    Camera
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getEmployeeById } from '../../api/employeeApi'
import EmployeeStatusTag from '../../components/EmployeeStatusTag'

const ProjectAllocationDropdown = ({ project, rawProject, navigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all hover:shadow-sm mb-2 flex flex-col gap-2">
            {/* Header / Clickable Area */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between cursor-pointer"
            >
                {/* Left Side: Dot and Title */}
                <div className="flex items-center gap-2.5 w-[75%]">
                    <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                    ></span>
                    <span className="font-semibold text-slate-800 truncate text-[13px]">{project.name}</span>
                </div>

                {/* Right Side: Allocation Pill */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                        {project.value}%
                    </span>
                    <ChevronRight
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </div>

            {/* Static Tag Placement */}
            <div className="ml-[22px] flex items-center gap-2">
                <EmployeeStatusTag status={rawProject.status} size="sm" />
                {rawProject.billable && (
                    <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${String(rawProject.billable).toLowerCase() === 'yes' || String(rawProject.billable).toLowerCase() === 'billable' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-500 border-orange-200'}`}
                    >
                        {String(rawProject.billable).toLowerCase() === 'yes' || String(rawProject.billable).toLowerCase() === 'billable' ? 'Billable' : 'Non-Billable'}
                    </span>
                )}
            </div>

            {/* Expanded Content Area */}
            {isExpanded && (
                <div className="mt-1 pt-2 border-t border-slate-100/80">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/info/projects', { state: { search: project.name } });
                        }}
                        className="w-full text-center bg-blue-50/50 border border-blue-100 hover:border-blue-300 hover:bg-blue-100 py-1.5 rounded-lg text-[11px] font-bold text-blue-700 transition-colors shadow-sm flex justify-center items-center gap-1.5 group"
                    >
                        <span>View Full Project Details</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">&rarr;</span>
                    </button>
                </div>
            )}
        </div>
    );
};


const EmployeeDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // State
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailedSkills, setShowDetailedSkills] = useState(false);

    useEffect(() => {
        const fetchEmployeeDetails = async () => {
            if (!id) return;

            try {
                const res = await getEmployeeById(id);
                // Extract inner data if nested
                const sourceData = res.data || res;

                // Inject status/billable into projects for tags
                const enhancedProjects = (sourceData.projects || []).map(p => ({
                    ...p,
                    status: p.status || sourceData.employee_status || 'Allocated',
                    billable: p.billable || sourceData.billable || (sourceData.employee_status === 'Bench' ? 'No' : 'Yes'), // prioritize project specific billable
                    name: p.project_name || p.name,
                    value: p.allocation_percentage || p.value || 0
                }));

                // Map backend keys to what the JSX components previously expected
                setUserData({
                    ...sourceData,
                    name: sourceData.employee_name || sourceData.name || sourceData.employee_id,
                    designation: sourceData.role_designation || sourceData.designation,
                    id: sourceData.employee_id || sourceData.id,
                    reportingManager: sourceData.reporting_manager || sourceData.reporting_manager_id || sourceData.reportingManager,
                    joiningDate: sourceData.date_of_joining || sourceData.joiningDate,
                    totalExperience: sourceData.total_experience !== undefined ? sourceData.total_experience : sourceData.totalExperience,
                    cdExperience: sourceData.experience_in_cd !== undefined ? sourceData.experience_in_cd : (sourceData.cd_experience !== undefined ? sourceData.cd_experience : sourceData.cdExperience),
                    shiftTiming: sourceData.shift || sourceData.shiftTiming,
                    status: {
                        allocated: sourceData.employee_status,
                        workMode: sourceData.mode_of_work,
                        location: sourceData.location || (sourceData.status && sourceData.status.location)
                    },
                    projects: enhancedProjects,
                    masterSkills: (sourceData.skills || []).map(s => {
                        if (typeof s === 'string') return { name: s, proficiency: 'Beginner', experience_years: 0 };
                        return {
                            name: s.skill_name || s.skill || s.name,
                            proficiency: s.proficiency || s.proficiency_level || 'Beginner',
                            experience_years: s.experience_years || 0
                        };
                    })
                });
            } catch (err) {
                console.error("Failed to fetch employee details", err);
                setError("Failed to load employee details.");
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeDetails();
    }, [id]);


    // Loading State
    if (loading) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
                <div className="text-slate-500 font-medium">Loading Employee Profile...</div>
            </div>
        )
    }

    // Error State
    if (error || !userData) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-red-500 font-medium">{error || "Employee not found"}</div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        )
    }

    // Chart Data Helpers
    // If projects is empty or undefined, handle gracefully
    const projects = userData.projects || [];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Timeline Helpers
    const timelineStartDate = new Date();
    timelineStartDate.setDate(1); // Default to start of current month
    timelineStartDate.setHours(0, 0, 0, 0);

    // Make timeline align dynamically with earliest project in DB so past projects aren't mismatched
    if (projects && projects.length > 0) {
        let earliestDate = new Date();
        let hasValidStart = false;
        projects.forEach(p => {
            const rawStart = p.start_date || p.allocation_start_date;
            if (rawStart) {
                const d = new Date(rawStart);
                if (!hasValidStart || d < earliestDate) {
                    earliestDate = d;
                    hasValidStart = true;
                }
            }
        });
        if (hasValidStart) {
            timelineStartDate.setFullYear(earliestDate.getFullYear());
            timelineStartDate.setMonth(earliestDate.getMonth());
        }
    }

    const getTimelineMonths = () => {
        const result = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date(timelineStartDate.getFullYear(), timelineStartDate.getMonth() + i, 1);
            const monthStr = date.toLocaleString('default', { month: 'short' });
            const yearStr = date.getFullYear().toString().slice(-2);
            result.push(`${monthStr} '${yearStr}`);
        }
        return result;
    };
    const months = getTimelineMonths();
    const totalWeeks = 12;

    const chartData = projects.map((p, index) => {
        let startWeek = 0;
        let durationWeeks = 4; // default if no dates
        let isVisibleInTimeline = true;

        // Handle potential different backend key names for dates
        const rawStartDate = p.start_date || p.allocation_start_date;
        const rawEndDate = p.end_date || p.allocation_end_date;

        if (rawStartDate || rawStartDate !== undefined) {
            const pStart = rawStartDate ? new Date(rawStartDate) : new Date(timelineStartDate);
            const pEnd = rawEndDate ? new Date(rawEndDate) : new Date(timelineStartDate.getFullYear() + 1, timelineStartDate.getMonth(), 1); // far future

            const getWeekOffset = (d) => (d.getTime() - timelineStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000);

            let sWeek = getWeekOffset(pStart);
            let eWeek = getWeekOffset(pEnd);

            if (eWeek <= 0 || sWeek >= 12) {
                // Completely outside the 90-day window
                isVisibleInTimeline = false;
            } else {
                // Clamp to window
                sWeek = Math.max(0, sWeek);
                eWeek = Math.min(12, eWeek);

                startWeek = Math.floor(sWeek);
                durationWeeks = Math.ceil(eWeek - startWeek); // Ensure duration counts precisely
                if (durationWeeks < 1) durationWeeks = 1;
                if (startWeek + durationWeeks > 12) {
                    durationWeeks = 12 - startWeek;
                }
                if (startWeek >= 12) startWeek = 11;
            }
        }

        return {
            name: p.project_name || p.name,
            value: p.allocation_percentage || p.value || 0,
            color: COLORS[index % COLORS.length],
            startWeek,
            durationWeeks,
            isVisibleInTimeline
        };
    });

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col gap-6">

            {/* Back Button */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>

            {/* 1. Top Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden shadow-sm relative bg-white group">
                        {userData.profilePic ? (
                            <img src={userData.profilePic} alt={userData.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-3xl font-bold uppercase select-none">
                                {(userData.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" />
                            <Camera size={24} />
                        </label>
                    </div>
                </div>

                {/* Info */}
                <div className="flex-grow text-center md:text-left">
                    <h1 className="text-2xl font-bold text-slate-900">{userData.name}</h1>
                    <p className="text-slate-500 font-medium mb-2">{userData.designation}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            {userData.id}
                        </div>
                        <EmployeeStatusTag
                            status={userData.status?.allocated}
                        />
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <a href={`https://outlook.office.com/mail/deeplink/compose?to=${userData.email}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <Mail size={16} />
                                <span>{userData.email}</span>
                            </a>
                        </div>
                        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <Phone size={16} />
                            <span>{userData.phone}</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* 2. Main Content Grid (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Left Column: Profile Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start">
                        <h2 className="text-lg font-bold text-slate-800">Profile Details</h2>
                        <div className="flex gap-2">
                            <EmployeeStatusTag status={userData.status?.allocated} size="sm" />
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] rounded-md font-bold uppercase tracking-wider border border-purple-200">{userData.status?.workMode}</span>
                        </div>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-slate-400 text-xs mb-1">Department</p>
                            <p className="font-semibold text-slate-700">{userData.department}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs mb-1">Reporting Manager</p>
                            <p className="font-semibold text-slate-700">{userData.reportingManager}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Joining Date</p>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Calendar size={14} className="text-slate-400" />
                                    {userData.joiningDate}
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Location</p>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <MapPin size={14} className="text-slate-400" />
                                    {userData.status?.location}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Total Exp</p>
                                <p className="font-semibold text-slate-700">{userData.totalExperience} Yrs</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs mb-1">CD Exp</p>
                                <p className="font-semibold text-slate-700">{userData.cdExperience} Yrs</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs mb-1">Shift Timing</p>
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                <Clock size={14} className="text-slate-400" />
                                {userData.shiftTiming}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Middle Column: Projects */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-visible">
                    <h2 className="text-lg font-bold text-slate-800">Projects Allocation</h2>

                    {/* Chart - Reduced Size */}
                    <div className="h-40 w-full relative" style={{ minHeight: '160px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} height={24} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center">
                            <span className="text-lg font-bold text-slate-800">
                                {chartData.reduce((sum, item) => sum + (Number(item.value) || 0), 0)}%
                            </span>
                        </div>
                    </div>

                    {/* Project Skills Detail */}
                    <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[140px] pr-2 custom-scrollbar py-1">
                        {chartData.map((project, idx) => (
                            <ProjectAllocationDropdown
                                key={idx}
                                project={project}
                                rawProject={projects[idx]}
                                navigate={navigate}
                            />
                        ))}
                    </div>
                </div>


                {/* Right Column: Skills & Certificates */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-y-auto custom-scrollbar">

                    {/* Master Skills */}
                    <div>
                        <div
                            className="flex justify-between items-center cursor-pointer mb-4 group"
                            onClick={() => setShowDetailedSkills(!showDetailedSkills)}
                        >
                            <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Master Skills & Concentration</h2>
                            <div className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors">
                                <ChevronRight size={16} className={`transition-transform duration-200 ${showDetailedSkills ? 'rotate-90' : ''}`} />
                            </div>
                        </div>

                        {showDetailedSkills ? (
                            <div className="flex flex-col gap-3 max-h-[190px] overflow-y-auto custom-scrollbar pr-2">
                                {userData.masterSkills && userData.masterSkills.map((skillObj, idx) => {
                                    const skillName = typeof skillObj === 'string' ? skillObj : skillObj.name;
                                    let rawProficiency = skillObj.proficiency || 'Beginner';
                                    const exp = skillObj.experience_years || 0;

                                    // Map numerical proficiency levels to words if the database stores 1-5
                                    if (String(rawProficiency) === '1') rawProficiency = 'Beginner';
                                    else if (String(rawProficiency) === '2') rawProficiency = 'Novice';
                                    else if (String(rawProficiency) === '3') rawProficiency = 'Intermediate';
                                    else if (String(rawProficiency) === '4') rawProficiency = 'Advanced';
                                    else if (String(rawProficiency) === '5') rawProficiency = 'Expert';

                                    const safeProficiency = String(rawProficiency).toLowerCase();

                                    let width = '25%';
                                    let color = 'bg-blue-300';
                                    if (safeProficiency === 'novice') { width = '40%'; color = 'bg-blue-300'; }
                                    else if (safeProficiency === 'intermediate') { width = '60%'; color = 'bg-blue-400'; }
                                    else if (safeProficiency === 'advanced') { width = '80%'; color = 'bg-blue-500'; }
                                    else if (safeProficiency === 'expert') { width = '100%'; color = 'bg-blue-600'; }

                                    const formatExperience = (years) => {
                                        if (!years) return '';
                                        const y = Math.floor(years);
                                        const m = Math.round((years - y) * 12);
                                        let parts = [];
                                        if (y > 0) parts.push(`${y} Year${y !== 1 ? 's' : ''}`);
                                        if (m > 0) parts.push(`${m} Month${m !== 1 ? 's' : ''}`);
                                        return parts.length > 0 ? `· ${parts.join(' ')}` : '';
                                    };

                                    return (
                                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-700">{skillName}</span>
                                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{rawProficiency} {formatExperience(exp)}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                <div className={`${color} h-full rounded-full transition-all duration-500 ease-out`} style={{ width }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {userData.masterSkills && userData.masterSkills.map((skillObj, idx) => {
                                    const skillName = typeof skillObj === 'string' ? skillObj : skillObj.name;
                                    return (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full cursor-pointer hover:bg-slate-200 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDetailedSkills(true);
                                            }}
                                        >
                                            {skillName}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full my-2"></div>

                    {/* Certificates */}
                    <div className="flex-grow">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Certificates</h2>
                        <ul className="space-y-3">
                            {userData.certificates && userData.certificates.map((cert, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <div className="mt-1 p-1 bg-orange-100 rounded-full text-orange-600">
                                        <Briefcase size={12} />
                                    </div>
                                    <span className="text-sm text-slate-700 font-medium">{cert}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>


            {/* 3. Bottom Section: Timeline (Forecast) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Resource Forecast Timeline (90 Days)</h2>

                {/* Improved Timeline Grid */}
                <div className="w-full overflow-x-auto custom-scrollbar border border-slate-100 rounded-xl shadow-sm">
                    <div className="min-w-[900px]">

                        {/* 1. Header Section (Fixed at top of chart) */}
                        <div className="sticky top-0 z-20 bg-white flex border-b border-slate-300">
                            {/* Empty space for labels */}
                            <div className="w-[180px] shrink-0 border-r border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky left-0 z-30"></div>

                            {/* Timeline Headers */}
                            <div className="flex-1">
                                {/* Months */}
                                <div className="grid grid-cols-12 border-b border-slate-200">
                                    {months.map((month, idx) => (
                                        <div key={idx} className="col-span-4 text-center text-xs font-bold text-slate-700 border-r border-slate-200 last:border-r-0 py-2 bg-slate-50">
                                            {month}
                                        </div>
                                    ))}
                                </div>

                                {/* Weeks */}
                                <div className="grid grid-cols-12 text-[10px] text-slate-500 font-bold bg-white">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="col-span-1 text-center border-r border-slate-100 last:border-r-0 py-1.5 uppercase tracking-wider">
                                            W{(i % 4) + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. Scrollable Rows Container (Vertical Scroll handles BOTH labels and bars simultaneously) */}
                        <div className="relative max-h-[240px] overflow-y-auto custom-scrollbar flex">

                            {/* Left Labels Column (Sticky Horizontal) */}
                            <div className="w-[180px] shrink-0 bg-white sticky left-0 z-20 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                <div className="py-4 space-y-3">
                                    {chartData.filter(p => p.isVisibleInTimeline).length > 0 ? chartData.filter(p => p.isVisibleInTimeline).map((project, idx) => (
                                        <div key={idx} className="h-10 pr-4 flex flex-col justify-center text-right hover:bg-slate-50 pl-3 border-r-2 border-transparent hover:border-blue-400 transition-colors group cursor-default">
                                            <span className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={project.name}>{project.name}</span>
                                            <span className="text-[10px] text-slate-500 font-semibold capitalize tracking-wide">{projects[idx]?.status || 'Allocated'}</span>
                                        </div>
                                    )) : (
                                        <div className="h-10 pr-4 flex flex-col justify-center text-right pl-3 text-xs text-slate-400 italic">No projects in this period</div>
                                    )}
                                </div>
                            </div>

                            {/* Right Timeline Area */}
                            <div className="flex-1 relative bg-[#fcfdfd]">
                                {/* Background Grid Lines */}
                                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none z-0 min-h-full">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className={`border-r border-slate-100/60 h-full ${i % 4 === 3 ? 'border-slate-200' : ''}`}></div>
                                    ))}
                                </div>

                                {/* Project Bars Rows */}
                                <div className="relative z-10 py-4 space-y-3">
                                    {chartData.filter(p => p.isVisibleInTimeline).map((project, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-0 items-center h-10 hover:bg-slate-100/50 transition-colors group">
                                            {/* Bar Container */}
                                            <div
                                                className="col-span-1 relative h-[26px] rounded-md flex items-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-gradient-to-r overflow-hidden ml-1"
                                                style={{
                                                    backgroundColor: project.color,
                                                    gridColumnStart: (project.startWeek || 0) + 1,
                                                    gridColumnEnd: `span ${project.durationWeeks || 4}`,
                                                    backgroundImage: `linear-gradient(90deg, ${project.color} 0%, ${project.color}dd 100%)`
                                                }}
                                                title={`${project.name} - ${project.value}%`}
                                            >
                                                {/* Subtle Background Pattern */}
                                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 50%, #ffffff 50%, #ffffff 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>

                                                {/* Start Indicator */}
                                                <div className="absolute -left-1.5 w-3 h-3 bg-white transform rotate-45 border-2 shadow-sm z-20 group-hover:scale-110 transition-transform" style={{ borderColor: project.color }}></div>

                                                {/* Inside Label */}
                                                <span className="ml-3 text-[11px] text-white font-bold px-2 truncate drop-shadow-sm relative z-10 flex items-center leading-none">
                                                    <span>{project.value}%</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Padding for bottom scroll */}
                                <div className="h-3"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default EmployeeDetails
