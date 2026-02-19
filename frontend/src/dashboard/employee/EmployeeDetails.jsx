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
    ChevronLeft
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
// import { getEmployeeById } from '../../api/employeeApi'   // ← API call commented out for mock mode
import EmployeeStatusTag from '../../components/EmployeeStatusTag'

// ─── Mock projects generator — derived from employee's skills ───────────────
const generateMockProjects = (emp) => {
    const allSkills = emp.skills || ['React', 'Node.js', 'SQL', 'Git'];
    const colors = ['#3BA9FB', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];
    const projectNames = [
        'Project Alpha', 'Project Beta', 'Digital Transform',
        'Cloud Migration', 'Data Platform', 'Portal v2'
    ];
    // Generate 2-3 projects based on allocation
    const alloc = emp.employee_allocations || 80;
    if (alloc === 0) return []; // Bench — no projects
    const count = alloc >= 100 ? 3 : 2;
    return Array.from({ length: count }, (_, i) => ({
        name: projectNames[i % projectNames.length],
        value: i === 0 ? Math.round(alloc * 0.6) : Math.round(alloc * 0.4 / (count - 1)),
        color: colors[i % colors.length],
        skills: allSkills.slice(i * 2, i * 2 + 2),
        startWeek: i * 2,
        durationWeeks: 8 - i * 2,
    }));
};

// ─── Mock experience generator ───────────────────────────────────────────────
const mockExperience = (emp, index = 0) => {
    const years = [2, 3, 5, 7, 9, 12][index % 6];
    const cdYears = Math.min(years, [1, 2, 3, 4][index % 4]);
    return { total: `${years} Years`, cd: `${cdYears} Years` };
};

const EmployeeDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // State
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // ── MOCK MODE: read employee from router state passed by Employee.jsx ──
        const mockEmp = location.state?.employee;

        if (mockEmp) {
            // Extract index from employee_id for deterministic mock data (EMP-1001 → 0)
            const idx = parseInt((mockEmp.employee_id || 'EMP-1001').replace(/\D/g, '')) - 1001;
            const exp = mockExperience(mockEmp, idx);
            const projects = generateMockProjects(mockEmp);

            setUserData({
                // Identity
                id: mockEmp.employee_id,
                name: mockEmp.employee_name,
                designation: mockEmp.role_designation,
                profilePic: mockEmp.photo_url || null,
                email: `${(mockEmp.employee_name || 'emp').toLowerCase().replace(/\s+/g, '.')}@company.com`,
                phone: `+91 9${String(1000000000 + idx * 7).slice(1)}`,

                // Status fields (used by EmployeeStatusTag)
                employee_status: mockEmp.employee_status,
                billable: mockEmp.billable,

                // Profile Details card
                department: mockEmp.department,
                reportingManager: ['Suresh Babu', 'Meera Balan', 'Karthik Raj', 'Deepa Nambiar'][idx % 4],
                joiningDate: mockEmp.date_of_joining || '2022-01-15',
                totalExperience: exp.total,
                cdExperience: exp.cd,
                shiftTiming: ['9:00 AM – 6:00 PM', '10:00 AM – 7:00 PM', '8:00 AM – 5:00 PM'][idx % 3],
                status: {
                    allocated: mockEmp.employee_status === 'Allocated' ? 'Allocated' : mockEmp.employee_status,
                    workMode: ['Hybrid', 'Remote', 'On-site'][idx % 3],
                    location: mockEmp.location,
                },

                // Projects (middle column)
                projects,

                // Skills & Certificates (right column)
                masterSkills: mockEmp.skills || ['React', 'Node.js', 'SQL', 'Git'],
                certificates: [
                    'AWS Certified Developer – Associate',
                    'Microsoft Azure Fundamentals',
                    'Certified Scrum Master (CSM)',
                ].slice(0, (idx % 3) + 1),
            });
            setLoading(false);
            return;
        }

        // ── REAL API MODE (commented out — uncomment when backend is ready) ──
        /*
        const fetchEmployeeDetails = async () => {
            try {
                const data = await getEmployeeById(id);
                setUserData(data);
            } catch (err) {
                console.error("Failed to fetch employee details", err);
                setError("Failed to load employee details.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchEmployeeDetails();
        }
        */

        // Fallback if navigated directly without state (e.g. browser refresh)
        setError('Employee data not available. Please go back and click on an employee from the table.');
        setLoading(false);

    }, [id, location.state]);


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
                    onClick={() => navigate('/info/employee')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Employee List
                </button>
            </div>
        )
    }

    // Chart Data Helpers
    // If projects is empty or undefined, handle gracefully
    const projects = userData.projects || [];
    const chartData = projects.map(p => ({
        name: p.name,
        value: p.value
    }));
    const COLORS = projects.map(p => p.color || '#ccc');

    // Timeline Helpers
    const months = ["Feb '26", "Mar '26", "Apr '26"];
    const totalWeeks = 12;

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col gap-6">

            {/* Back Button */}
            <div>
                <button
                    onClick={() => navigate('/info/employee')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Employee List
                </button>
            </div>

            {/* 1. Top Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden shadow-sm relative bg-white">
                        {userData.profilePic ? (
                            <img src={userData.profilePic} alt={userData.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 text-3xl font-bold uppercase select-none">
                                {(userData.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                        )}
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
                            status={userData.employee_status || userData.status}
                            billable={userData.billable}
                        />
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <Mail size={16} />
                            <span>{userData.email}</span>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                        <h2 className="text-lg font-bold text-slate-800">Profile Details</h2>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">{userData.status?.allocated}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">{userData.status?.workMode}</span>
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
                                <p className="font-semibold text-slate-700">{userData.totalExperience}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs mb-1">CD Exp</p>
                                <p className="font-semibold text-slate-700">{userData.cdExperience}</p>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6">
                    <h2 className="text-lg font-bold text-slate-800">Projects Allocation</h2>

                    {/* Chart - Reduced Size */}
                    <div className="h-40 w-full relative" style={{ minHeight: '160px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45} // Reduced
                                    outerRadius={60} // Reduced
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} height={24} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center">
                            <span className="text-lg font-bold text-slate-800">100%</span>
                        </div>
                    </div>

                    {/* Project Skills Detail */}
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                        {projects.map((project, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></span>
                                        {project.name}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">{project.value}%</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {project.skills && project.skills.map((skill, sIdx) => (
                                        <span key={sIdx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] rounded-full">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                {/* Right Column: Skills & Certificates */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6">

                    {/* Master Skills */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Master Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {userData.masterSkills && userData.masterSkills.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full hover:bg-slate-200 transition-colors">
                                    {skill}
                                </span>
                            ))}
                        </div>
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
                <div className="w-full">
                    {/* Horizontal Scroll Wrapper for entire chart if screen is small */}
                    <div className="min-w-[800px] overflow-x-auto">

                        {/* 1. Header Section (Fixed at top of chart) */}
                        <div className="sticky top-0 z-20 bg-white">
                            {/* Months */}
                            <div className="grid grid-cols-12 border-b border-slate-300">
                                {months.map((month, idx) => (
                                    <div key={idx} className="col-span-4 text-center text-sm font-bold text-slate-700 border-r border-slate-300 last:border-r-0 py-2 bg-slate-50">
                                        {month}
                                    </div>
                                ))}
                            </div>

                            {/* Weeks */}
                            <div className="grid grid-cols-12 border-b border-slate-300 text-[10px] text-slate-500 font-semibold bg-white">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="col-span-1 text-center border-r border-slate-200 last:border-r-0 py-1.5">
                                        W{(i % 4) + 1}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Scrollable Rows Container (Vertical Scroll) */}
                        <div className="relative max-h-[180px] overflow-y-auto custom-scrollbar">

                            {/* Background Grid Lines - Absolute to cover full scrollable height */}
                            <div className="absolute inset-0 grid grid-cols-12 pointer-events-none z-0 min-h-full">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className={`border-r border-slate-100 h-full ${i % 4 === 3 ? 'border-slate-300' : ''}`}></div>
                                ))}
                            </div>

                            {/* Project Rows */}
                            <div className="relative z-10 py-4 space-y-3">
                                {projects.map((project, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-0 items-center h-10 hover:bg-slate-50/50 transition-colors">

                                        {/* Row Label (spans across grid visually but is absolutely positioned or managed? 
                                            Actually, to keep it aligned with the bar, we can't easily put it in the grid cells if the bar spans multiple.
                                            Let's use a flex overlay or just keep the label on the left but ensure it doesn't overlap weirdly.
                                            Wait, the user wants the name *in the left side*.
                                            The previous implementation had a "bubble" outside.
                                            Let's dedicate the first column (or a separate div side-by-side) to labels? 
                                            No, grid logic is based on 12 cols = 12 weeks.
                                            I will stick to the previous "absolute left" approach but ensure padding/margin accommodates it.
                                         */}

                                        {/* Label */}
                                        <div className="absolute left-0 w-32 -ml-32 text-right pr-4 flex flex-col justify-center h-full">
                                            <span className="text-xs font-bold text-slate-700 truncate" title={project.name}>{project.name}</span>
                                            <span className="text-[10px] text-slate-400">Allocated</span>
                                        </div>

                                        {/* Bar */}
                                        <div
                                            className="col-span-1 relative h-6 rounded-md flex items-center shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer"
                                            style={{
                                                backgroundColor: '#22c55e',
                                                gridColumnStart: (project.startWeek || 0) + 1,
                                                gridColumnEnd: `span ${project.durationWeeks || 4}`,
                                            }}
                                        >
                                            {/* Start Indicator (Diamond) */}
                                            <div className="absolute -left-1.5 w-3 h-3 bg-orange-500 transform rotate-45 border-2 border-white shadow-sm z-20"></div>

                                            {/* Label Inside Bar */}
                                            <span className="ml-3 text-[10px] text-white font-bold px-2 truncate drop-shadow-sm">
                                                {project.value}%
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Padding for bottom scroll */}
                                <div className="h-2"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    )
}

export default EmployeeDetails
