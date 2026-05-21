import React, { useState, useEffect } from 'react'
import { useDataRefresh } from '../../context'
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
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getEmployeeById, deleteEmployee } from '../../api/employeeApi'
import { clearDashboardCache } from '../../api/dashboardApi'
import EmployeeStatusTag from '../../components/EmployeeStatusTag'
import { getEmployeeStatus } from '../../utils/employeeStatus'
import { usePermissions } from '../../hooks/usePermissions'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'
import { decodeId } from '../../utils/idEncoder'
import { isValidPhoto } from '../../utils/imageHelper'

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
                    <ChevronRight
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                </div>
            </div>

            {/* Expanded Content Area */}
            {isExpanded && (
                <div className="mt-1 pt-2 border-t border-slate-100/80">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const pid = rawProject?.project_id || rawProject?.id;
                            if (pid) {
                                navigate(`/info/projects/${pid}`);
                            } else {
                                navigate('/info/projects', { state: { search: project.name } });
                            }
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


const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100 flex flex-col gap-2 z-50 min-w-[150px]">
                <p className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1">{data.name}</p>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Allocation</span>
                        <span className="text-sm font-bold text-blue-600">{data.value}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                        <EmployeeStatusTag status={data.status} size="sm" />
                    </div>
                </div>
            </div>
        );
    }
    return null;
};


const EmployeeDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { triggerRefresh } = useDataRefresh();
    const { isFieldHidden } = usePermissions();
    // State
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailedSkills, setShowDetailedSkills] = useState(false);
    const [showAllSkills, setShowAllSkills] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imgError, setImgError] = useState(false);
    const SKILLS_PREVIEW_COUNT = 7;
    const returnTarget = location.state?.from;
    const backLabel = returnTarget?.pathname?.includes('availability')
        ? 'Back to Availability'
        : 'Go Back';

    const handleGoBack = () => {
        // Explicitly handle return to highlights for auto-scroll
        if (location.state?.from === 'highlights') {
            navigate('/info/dashboard', { state: { from: 'highlights' } });
            return;
        }

        if (returnTarget?.pathname) {
            const targetPath = `${returnTarget.pathname}${returnTarget.search || ''}${returnTarget.hash || ''}`;
            navigate(targetPath, { state: returnTarget.state || null });
            return;
        }
        navigate(-1);
    };

    useEffect(() => {
        setImgError(false);
        const fetchEmployeeDetails = async () => {
            if (!id) return;
            const decodedId = decodeId(id);

            try {
                const res = await getEmployeeById(decodedId);
                // Extract inner data if nested
                const sourceData = res.data || res;

                // Filter out projects with status "End" or "Ended" or "Completed" OR if end_date is in the past
                const activeProjects = [];
                const completedProjects = [];
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                (sourceData.projects || []).forEach(p => {
                    const s = (p.status || "").toLowerCase();
                    const rawEndDate = p.end_date || p.allocation_end_date || p.project_end_date;
                    const pEnd = rawEndDate ? new Date(rawEndDate) : null;
                    if (pEnd) pEnd.setHours(23, 59, 59, 999); // End of the day

                    const isPast = pEnd && pEnd < now;
                    const isEndedStatus = s.includes('end') || s.includes('complet');

                    if (isEndedStatus || isPast) {
                        completedProjects.push(p);
                    } else {
                        activeProjects.push(p);
                    }
                });

                // Inject status/billable into projects for tags
                const enhancedProjects = activeProjects.map(p => ({
                    ...p,
                    status: p.status || sourceData.employee_status || 'Allocated',
                    billable: p.billable || sourceData.billable || (sourceData.employee_status === 'Bench' ? 'No' : 'Yes'),
                    name: p.project_name || p.name,
                    value: p.allocation_percentage || p.project_allocation || p.value || 0
                }));

                const enhancedCompletedProjects = completedProjects.map(p => ({
                    ...p,
                    status: p.status || 'Completed',
                    billable: p.billable || sourceData.billable || 'No',
                    name: p.project_name || p.name,
                    value: p.allocation_percentage || p.project_allocation || p.value || 0
                }));

                const totalAllocation = enhancedProjects.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
                const displayStatus = getEmployeeStatus({
                    ...sourceData,
                    employee_allocations: totalAllocation,
                });

                // Map backend keys to what the JSX components previously expected
                setUserData({
                    ...sourceData,
                    profilePic: sourceData.photo_url || sourceData.profilePic || sourceData.profile_pic,
                    name: sourceData.employee_name || sourceData.name || sourceData.employee_id,
                    designation: sourceData.role_designation || sourceData.designation,
                    id: sourceData.employee_id || sourceData.id,
                    reportingManager: (() => {
                        const mgr = sourceData.reporting_manager || sourceData.reportingManager;
                        // If it looks like an employee ID (e.g. starts with CD-), don't show it
                        if (!mgr || /^CD-/i.test(String(mgr))) return 'N/A';
                        return mgr;
                    })(),
                    joiningDate: sourceData.date_of_joining || sourceData.joiningDate,
                    totalExperience: sourceData.total_experience !== undefined ? sourceData.total_experience : sourceData.totalExperience,
                    cdExperience: sourceData.experience_in_cd !== undefined ? sourceData.experience_in_cd : (sourceData.cd_experience !== undefined ? sourceData.cd_experience : sourceData.cdExperience),
                    shiftTiming: sourceData.shift || sourceData.shiftTiming,
                    status: {
                        allocated: displayStatus,
                        workMode: sourceData.work_mode || sourceData.mode_of_work,
                        location: sourceData.location || (sourceData.status && sourceData.status.location)
                    },
                    projects: enhancedProjects,
                    completedProjects: enhancedCompletedProjects,
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
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    {backLabel}
                </button>
            </div>
        )
    }

    // Chart Data Helpers
    // If projects is empty or undefined, handle gracefully
    const projects = userData.projects || [];
    const completedProjectsList = userData.completedProjects || [];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Current date for relative calculations
    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);

    // Anchor to the Monday of the current week to show only current and future data
    const getMondayOfDate = (d) => {
        const date = new Date(d);
        const day = date.getDay() || 7;
        date.setDate(date.getDate() - day + 1);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const TIMELINE_START = getMondayOfDate(TODAY);
    const TOTAL_WEEKS = 12; // 90-day window (~3 months)

    // Build dynamic month labels based on the weeks actually shown in the grid
    const getTimelineMonths = () => {
        const monthGroups = [];
        for (let i = 0; i < TOTAL_WEEKS; i++) {
            const d = new Date(TIMELINE_START);
            d.setDate(TIMELINE_START.getDate() + i * 7);
            const monthLabel = d.toLocaleString('default', { month: 'short' }) + " '" + d.getFullYear().toString().slice(-2);

            if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].label !== monthLabel) {
                monthGroups.push({ label: monthLabel, count: 1, startIndex: i });
            } else {
                monthGroups[monthGroups.length - 1].count++;
            }
        }
        return monthGroups;
    };
    const monthGroups = getTimelineMonths();

    // Map raw project date strings to week-offsets relative to TODAY.
    // - Projects that started before today but haven't ended yet are clamped to start at week 0.
    // - Projects that ended before today are excluded (isVisibleInTimeline = false).
    // - Projects with no dates are shown spanning the full window.
    const chartData = projects.map((p, index) => {
        let startWeek = 0;
        let durationWeeks = TOTAL_WEEKS; // default: show full window if no dates given
        let isVisibleInTimeline = true;
        let sWeekRaw = 0; // Default: current
        let eWeekRaw = TOTAL_WEEKS; // Default: current/ongoing

        const rawStartDate = p?.start_date || p?.allocation_start_date || p?.project_start_date;
        const rawEndDate = p?.end_date || p?.allocation_end_date || p?.project_end_date;

        const parseDateLocal = (str) => {
            if (!str) return null;
            const d = new Date(str);
            if (isNaN(d.getTime())) return null;
            // Normalize to local midnight to match TODAY's anchor
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        if (rawStartDate || rawEndDate) {
            const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

            const pStart = parseDateLocal(rawStartDate) || TIMELINE_START;
            const pEnd = parseDateLocal(rawEndDate) || new Date(TIMELINE_START.getFullYear() + 1, TIMELINE_START.getMonth(), TIMELINE_START.getDate());

            // Week offsets relative to TIMELINE_START
            sWeekRaw = (pStart.getTime() - TIMELINE_START.getTime()) / MS_PER_WEEK;
            eWeekRaw = (pEnd.getTime() - TIMELINE_START.getTime()) / MS_PER_WEEK;

            // If the project status is NOT Ended/Completed, keep it visible even if date passed
            const isEndedStatus = (p.status || "").toLowerCase().includes('end') || (p.status || "").toLowerCase().includes('complet');

            if (eWeekRaw <= 0 && isEndedStatus) {
                isVisibleInTimeline = false;
            }
            // If the project starts after the 90-day window — exclude
            else if (sWeekRaw >= TOTAL_WEEKS) {
                isVisibleInTimeline = false;
            } else {
                // Clamp both ends to the visible [0, TOTAL_WEEKS] window
                // If it ended in the past but is still active, show it as starting at week 0 and having at least 1 week duration
                const sWeekClamped = Math.max(0, sWeekRaw);
                const eWeekClamped = Math.max(sWeekClamped + 1, Math.min(TOTAL_WEEKS, eWeekRaw));

                startWeek = Math.floor(sWeekClamped);
                durationWeeks = Math.max(1, Math.ceil(eWeekClamped - sWeekClamped));

                // Safety: don't overflow past end of grid
                if (startWeek + durationWeeks > TOTAL_WEEKS) {
                    durationWeeks = TOTAL_WEEKS - startWeek;
                }
                if (startWeek >= TOTAL_WEEKS) startWeek = TOTAL_WEEKS - 1;
            }
        }

        // Determine if project is current (active as of today)
        // A project is current if it's currently running (starts today or earlier) 
        // AND if its end date hasn't passed (or it's not marked as Ended/Completed)
        // A project is current if it's currently running (starts today or earlier) 
        // AND if its end date hasn't passed (or it's not marked as Ended/Completed)
        const isEndedStatus = (p.status || "").toLowerCase().includes('end') || (p.status || "").toLowerCase().includes('complet');

        const nowWeekOffset = (TODAY.getTime() - TIMELINE_START.getTime()) / (7 * 24 * 60 * 60 * 1000);
        // A project is current if it spans over the current week AND its end date hasn't passed
        const isCurrent = sWeekRaw <= nowWeekOffset + 0.01 && eWeekRaw >= nowWeekOffset - 0.01;
        const isFuture = sWeekRaw > nowWeekOffset + 0.01;

        return {
            name: p.project_name || p.name,
            value: p.allocation_percentage || p.project_allocation || p.value || 0,
            status: p.status || 'Allocated',
            color: COLORS[index % COLORS.length],
            startWeek,
            durationWeeks,
            isVisibleInTimeline,
            isCurrent,
            isFuture,
            project_id: p.project_id || p.id
        };
    });


    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col gap-6">
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    setIsDeleting(true);
                    try {
                        await deleteEmployee(userData.employee_id || userData.id || id);
                        clearDashboardCache(); // Sync dashboard
                        triggerRefresh();
                        navigate('/info/employees/list');
                    } catch (err) {
                        console.error('Delete failed', err);
                        toast.error('Delete failed: ' + (err.response?.data?.detail || err.message));
                    } finally {
                        setIsDeleting(false);
                        setIsDeleteModalOpen(false);
                    }
                }}
                itemName={userData.name}
                isDeleting={isDeleting}
            />

            {/* Back Button */}
            <div>
                <button
                    onClick={handleGoBack}
                    className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                    title="Go Back"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
            </div>

            {/* 1. Top Profile Header */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden shadow-sm relative bg-white group">
                        {isValidPhoto(userData.profilePic) && !imgError ? (
                            <img 
                                src={userData.profilePic} 
                                alt={userData.name} 
                                className="w-full h-full object-cover" 
                                onLoad={(e) => {
                                    if (e.target.naturalWidth === 102 && e.target.naturalHeight === 103) {
                                        setImgError(true);
                                    }
                                }}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-3xl font-bold uppercase select-none">
                                {(userData?.name || 'User').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" />
                            <Camera size={24} />
                        </label>
                    </div>
                </div>

                {/* Info */}
                <div className="flex-grow text-center md:text-left min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight break-words min-w-0">{userData.name}</h1>
                        <div className="flex items-center justify-center md:justify-end gap-2 shrink-0">
                            <button onClick={() => navigate('/info/employee/add', { 
                                replace: true,
                                state: { 
                                    editData: userData, 
                                    editEmployeeId: userData.employee_id || userData.id || id, 
                                    isEditMode: true 
                                } 
                            })} className="px-4 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors shadow-sm">Edit</button>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="px-4 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg transition-colors shadow-sm">Delete</button>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-2">{userData.designation}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            {userData.id}
                        </div>
                        <EmployeeStatusTag
                            status={userData.status?.allocated}
                        />
                        {userData.billable && !['leadership', 'internal operations', 'training', 'resigned'].includes((userData.status?.allocated || '').toLowerCase()) && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${userData.billable === 'billable'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                {userData.billable === 'billable' ? 'Billable' : 'Non-Billable'}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <a href={`https://outlook.office.com/mail/deeplink/compose?to=${userData.email}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                <Mail size={16} />
                                <span>{userData.email}</span>
                            </a>
                        </div>
                        {!isFieldHidden('employees', 'phone') && !isFieldHidden('employees', 'phone_number') && (
                            <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                <Phone size={16} />
                                <span>{userData.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* 2. Main Content Grid (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Left Column: Profile Info */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-y-auto custom-scrollbar">
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
                                <p className="font-semibold text-slate-700">
                                    {userData.joiningDate && !isNaN(new Date(userData.joiningDate).getTime())
                                        ? (() => {
                                            const joined = new Date(userData.joiningDate);
                                            const now = new Date();
                                            const ageInMs = now.getTime() - joined.getTime();
                                            const years = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
                                            return years >= 1
                                                ? `${Math.floor(years)} Yr${Math.floor(years) !== 1 ? 's' : ''}`
                                                : `${Math.max(0, Math.round(years * 12))} Mo`;
                                        })()
                                        : `${userData.cdExperience ?? '—'} Yrs`}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs mb-1">Shift Timing</p>
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                <Clock size={14} className="text-slate-400" />
                                {userData.shiftTiming}
                            </div>
                        </div>
                        {userData.employee_status === 'PIP' && (
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-amber-600 text-xs font-bold mb-2 flex items-center gap-1">
                                    <Clock size={12} />
                                    PIP PERIOD
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">Start Date</p>
                                        <p className="font-semibold text-slate-700 text-xs">{userData.pip_start_date || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">End Date</p>
                                        <p className="font-semibold text-slate-700 text-xs">{userData.pip_end_date || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {userData.employee_status === 'Notice period' && (
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-red-600 text-xs font-bold mb-2 flex items-center gap-1">
                                    <Clock size={12} />
                                    NOTICE PERIOD
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">Start Date</p>
                                        <p className="font-semibold text-slate-700 text-xs">{userData.notice_start_date || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">End Date</p>
                                        <p className="font-semibold text-slate-700 text-xs">{userData.notice_end_date || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Middle Column: Projects */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-visible">
                    <h2 className="text-lg font-bold text-slate-800">Projects Allocation</h2>

                    {/* Chart - Reduced Size */}
                    <div className="h-40 w-full relative" style={{ minHeight: '160px' }}>
                        <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                            <PieChart>
                                <Tooltip
                                    content={<CustomPieTooltip />}
                                    cursor={false}
                                    position={{ x: 190, y: 100 }}
                                    allowEscapeViewBox={{ x: true, y: true }}
                                    wrapperStyle={{ zIndex: 100 }}
                                />
                                <Pie
                                    data={chartData.filter(item => item.isCurrent)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={70}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.filter(item => item.isCurrent).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend content={() => null} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[50%] text-center text-slate-800 font-bold text-lg">
                            {(() => {
                                const total = chartData.filter(item => item.isCurrent).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
                                return total === 0 ? "0%" : `${total}%`;
                            })()}
                        </div>
                    </div>


                </div>


                {/* Right Column: Skills & Certificates */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col gap-6 max-h-[420px] overflow-y-auto custom-scrollbar">

                    {/* Master Skills */}
                    <div>
                        <div
                            className="flex justify-between items-center cursor-pointer mb-4 group"
                            onClick={() => setShowDetailedSkills(!showDetailedSkills)}
                        >
                            <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Skills</h2>
                            <div className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors">
                                <ChevronRight size={16} className={`transition-transform duration-200 ${showDetailedSkills ? 'rotate-90' : ''}`} />
                            </div>
                        </div>

                        {showDetailedSkills ? (
                            <div className="flex flex-col gap-3 max-h-[190px] overflow-y-auto custom-scrollbar pr-2">
                                {userData.masterSkills && (showAllSkills ? userData.masterSkills : userData.masterSkills.slice(0, SKILLS_PREVIEW_COUNT)).map((skillObj, idx) => {
                                    const skillName = typeof skillObj === 'string' ? skillObj : skillObj.name;
                                    let rawProficiency = skillObj.proficiency || 'Beginner';
                                    const exp = skillObj.experience_years || 0;

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
                                {userData.masterSkills && userData.masterSkills.length > SKILLS_PREVIEW_COUNT && (
                                    <button
                                        onClick={() => setShowAllSkills(s => !s)}
                                        className="mt-1 w-full py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-all"
                                    >
                                        {showAllSkills
                                            ? `View Less ↑`
                                            : `View More · ${userData.masterSkills.length - SKILLS_PREVIEW_COUNT} more skill${userData.masterSkills.length - SKILLS_PREVIEW_COUNT !== 1 ? 's' : ''} ↓`
                                        }
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {userData.masterSkills && userData.masterSkills.slice(0, 6).map((skillObj, idx) => {
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
                                {userData.masterSkills && userData.masterSkills.length > 6 && (
                                    <span
                                        className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100"
                                        onClick={(e) => { e.stopPropagation(); setShowDetailedSkills(true); }}
                                    >
                                        +{userData.masterSkills.length - 6} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full my-2"></div>

                    {/* Certificates */}
                    <div className="flex-grow">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Certificates</h2>
                        {userData.certificates && userData.certificates.length > 0 ? (
                            <ul className="space-y-3">
                                {userData.certificates.map((cert, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 p-1 bg-orange-100 rounded-full text-orange-600">
                                            <Briefcase size={12} />
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium">{cert}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No certification</p>
                        )}
                    </div>
                </div>

            </div>


            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Resource Forecast Timeline (90 Days)</h2>

                {/* Improved Timeline Grid */}
                <div className="w-full overflow-x-auto custom-scrollbar border border-slate-100 rounded-xl shadow-md">
                    <div className="min-w-[900px]">

                        {/* 1. Header Section (Fixed at top of chart) */}
                        <div className="sticky top-0 z-20 bg-white flex border-b border-slate-300">
                            {/* Empty space for labels */}
                            <div className="w-[180px] shrink-0 border-r border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky left-0 z-30"></div>

                            {/* Timeline Headers */}
                            <div className="flex-1">
                                {/* Months */}
                                <div className="grid grid-cols-12 border-b border-slate-200">
                                    {monthGroups.map((mg, idx) => (
                                        <div
                                            key={idx}
                                            className="text-center text-xs font-bold text-slate-700 border-r-2 border-slate-300 last:border-r-0 py-2 bg-slate-50"
                                            style={{ gridColumn: `span ${mg.count}` }}
                                        >
                                            {mg.label}
                                        </div>
                                    ))}
                                </div>
                                {/* Weeks */}
                                <div className="grid grid-cols-12 text-[10px] text-slate-500 font-bold bg-white">
                                    {[...Array(12)].map((_, i) => {
                                        const weekDate = new Date(TIMELINE_START);
                                        weekDate.setDate(TIMELINE_START.getDate() + i * 7);
                                        const isCurrentWeek = TODAY >= weekDate && TODAY < new Date(weekDate.getTime() + 7 * 24 * 60 * 60 * 1000);

                                        // Find which month group this week belongs to to calculate W1, W2, etc.
                                        const mg = [...monthGroups].reverse().find(g => i >= g.startIndex);
                                        const weekNum = i - (mg?.startIndex || 0) + 1;
                                        const isMonthEnd = mg && (mg.startIndex + mg.count - 1 === i);

                                        return (
                                            <div key={i} className={`col-span-1 text-center border-r ${isMonthEnd ? 'border-slate-300 border-r-2' : 'border-slate-100'} last:border-r-0 py-1.5 uppercase tracking-wider ${isCurrentWeek ? 'bg-blue-50 text-blue-600' : ''}`}>
                                                {isCurrentWeek ? 'NOW' : `W${weekNum}`}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 2. Scrollable Rows Container (Vertical Scroll handles BOTH labels and bars simultaneously) */}
                        <div className="relative max-h-[240px] overflow-y-auto custom-scrollbar flex">

                            {/* Left Labels Column (Sticky Horizontal) */}
                            <div className="w-[180px] shrink-0 bg-white sticky left-0 z-20 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                <div className="py-4 space-y-3">
                                    {chartData.filter(p => p.isVisibleInTimeline).length > 0 ? chartData.filter(p => p.isVisibleInTimeline).map((project, idx) => (
                                        <div
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const pid = project.project_id || projects[idx]?.project_id || projects[idx]?.id;
                                                if (pid) {
                                                    navigate(`/info/projects/${pid}`);
                                                } else {
                                                    navigate('/info/projects', { state: { search: project.name } });
                                                }
                                            }}
                                            className="h-10 pr-4 flex flex-col justify-center text-right hover:bg-slate-50 pl-3 border-r-2 border-transparent hover:border-blue-400 transition-colors group cursor-pointer"
                                        >
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
                                    {[...Array(12)].map((_, i) => {
                                        const mg = [...monthGroups].reverse().find(g => i >= g.startIndex);
                                        const isMonthEnd = mg && (mg.startIndex + mg.count - 1 === i);
                                        return (
                                            <div key={i} className={`border-r ${isMonthEnd ? 'border-slate-300 border-r-2' : 'border-slate-100/60'} h-full last:border-r-0`}></div>
                                        );
                                    })}
                                </div>

                                {/* Project Bars Rows */}
                                <div className="relative z-10 py-4 space-y-3">
                                    {chartData.filter(p => p.isVisibleInTimeline).map((project, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-0 items-center h-10 hover:bg-slate-100/50 transition-colors group">
                                            {/* Bar Container */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const pid = project.project_id || projects[idx]?.project_id || projects[idx]?.id;
                                                    if (pid) {
                                                        navigate(`/info/projects/${pid}`);
                                                    } else {
                                                        navigate('/info/projects', { state: { search: project.name } });
                                                    }
                                                }}
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
                                                    <span>{project.value === 0 ? "No Allocation" : `${project.value}%`}</span>
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
