import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const SkillTag = ({ skill }) => (
    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80 border border-white/5 whitespace-nowrap">
        {skill}
    </span>
);

const DonutChart = () => {
    // Simple SVG Donut Chart representation
    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                {/* Background Ring */}
                <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />

                {/* Segment 1: Project A (60%) */}
                <path className="text-[#7C3AED]" strokeDasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-sm font-bold">160%</span>
            </div>
        </div>
    );
};

const EmployeeProfile = ({ employee }) => {
    if (!employee) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Personal Info */}
            <div className="lg:col-span-2 space-y-6">
                {/* Main Profile Card */}
                <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">Profile</h3>
                        <div className="flex gap-2">
                            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">{employee.status}</span>
                            <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full">Hybrid</span>
                            <span className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full flex items-center gap-1"><MapPin size={10} /> {employee.location}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 rounded-full border-2 border-white/20 overflow-hidden relative bg-white/5">
                            {employee.avatar ? (
                                <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/10 text-white text-2xl font-bold uppercase select-none">
                                    {(employee.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-1">{employee.name}</h2>
                            <p className="text-white/60 mb-1">{employee.designation}</p>
                            <p className="text-xs text-white/40 mb-3">{employee.id}</p>

                            <div className="flex items-center gap-6 mt-4 text-sm text-white/80">
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-[#7C3AED]" />
                                    {employee.email}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-[#7C3AED]" />
                                    {employee.phone}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-6"></div>

                    <div className="grid grid-cols-2 gap-y-6 text-sm">
                        <div>
                            <label className="block text-white/40 text-xs mb-1">Department</label>
                            <div className="font-semibold">{employee.department}</div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs mb-1">Total Experience</label>
                            <div className="font-semibold">{employee.totalExp}</div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs mb-1">Reporting Manager</label>
                            <div className="font-semibold">{employee.manager}</div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs mb-1">CD Experience</label>
                            <div className="font-semibold">{employee.managerExp}</div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs mb-1">Joining Date</label>
                            <div className="font-semibold">{employee.joiningDate}</div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs mb-1">Shift Timing</label>
                            <div className="font-semibold">{employee.shift}</div>
                        </div>
                    </div>
                </div>

                {/* Include Resource Timeline Only in detailed view? The user req put it separate. 
             I'll leave it in the main dashboard for now, or add it here if requested.
             User Req: "Resource Forecast Timeline: A Gantt-chart... at the bottom". 
             Most likely global at bottom, but let's keep it separate for now.
          */}
            </div>

            {/* RIGHT COLUMN: Projects & Skills */}
            <div className="space-y-6">
                {/* Projects Card */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-lg mb-6">Projects</h3>

                    <div className="flex items-center gap-6 mb-6">
                        <DonutChart />
                        <div className="space-y-3  text-xs">
                            {employee.projects.map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${p.allocation > 0 ? 'bg-[#7C3AED]' : 'bg-gray-500'}`}></div>
                                    <div>
                                        <p className="font-semibold text-white">{p.name}</p>
                                        <p className="text-white/40">{p.role || 'Past Project'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-4"></div>

                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2">
                            <span>{employee.projects[0].name}</span>
                            <span className="text-white/40">Role: {employee.projects[0].role}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold mb-1">
                            <span>Allocation: {employee.projects[0].allocation}%</span>
                        </div>
                        <div className="text-xs text-white/40">Date: {employee.projects[0].date}</div>
                    </div>

                    <div>
                        <label className="block text-white/40 text-xs mb-2">Skills in this Project</label>
                        <div className="flex flex-wrap gap-2">
                            {['AWS', 'Terraform', 'GitHub Actions'].map(s => <SkillTag key={s} skill={s} />)}
                        </div>
                    </div>
                </div>

                {/* Master Skills Helper */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-lg mb-4">Master Skills</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {employee.skills.map(s => <SkillTag key={s} skill={s} />)}
                    </div>

                    <h3 className="font-bold text-lg mb-4">Certificates</h3>
                    <ul className="space-y-2 text-sm text-white/80">
                        {employee.certificates.map(c => (
                            <li key={c} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full"></div>
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfile;
