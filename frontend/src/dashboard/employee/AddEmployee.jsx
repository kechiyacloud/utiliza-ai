import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, FolderKanban, Check } from 'lucide-react';
import { createEmployee, updateEmployee } from '../../api/employeeApi';
import { DEPARTMENTS, LOCATIONS, WORK_MODES, EMPLOYMENT_TYPES } from '../../data/constants';
import { DEPARTMENT_SKILLS, ALL_SKILLS } from '../../data/skills';

const AddEmployee = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isEditMode = location.state?.isEditMode || false;
    const editData = location.state?.editData || null;

    const [currentSection, setCurrentSection] = useState('personal'); // personal, professional, project, preview
    const [loading, setLoading] = useState(false);
    const [skillSearch, setSkillSearch] = useState('');
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState({
        project_id: '',
        project_role: '',
        project_allocation: 0,
        project_start_date: '',
        project_end_date: ''
    });
    const [showPreview, setShowPreview] = useState(false); // Track if preview tab should be visible
    const [completedSections, setCompletedSections] = useState([]); // Track which sections are completed

    // Form state
    const [formData, setFormData] = useState({
        // Personal
        employee_id: '',
        employee_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        photo_url: '',
        date_of_joining: '',

        // Professional
        role_designation: '',
        department: '',
        employment_type: 'Full-time',
        location: '',
        work_mode: 'Hybrid',
        employee_status: 'Bench',
        employee_allocations: 0,
        skills: [],
        certificates: [], // Array of {name: '', file: null, fileData: ''}

        // Projects - now array for multiple projects
        projects: []
    });

    useEffect(() => {
        if (isEditMode && editData) {
            setFormData({
                employee_id: editData.id || editData.employee_id || '',
                employee_name: editData.name || editData.employee_name || '',
                email: editData.email || '',
                phone: editData.phone || '',
                date_of_birth: editData.date_of_birth || '',
                address: editData.address || '',
                photo_url: editData.photo_url || editData.profilePic || '',
                date_of_joining: editData.joiningDate || editData.date_of_joining || '',
                role_designation: editData.designation || editData.role_designation || '',
                department: editData.department || '',
                employment_type: editData.employment_type || 'Full-time',
                location: editData.status?.location || editData.location || '',
                work_mode: editData.status?.workMode || editData.work_mode || 'Hybrid',
                employee_status: editData.status?.allocated || editData.employee_status || 'Bench',
                employee_allocations: typeof editData.employee_allocations === 'number' ? editData.employee_allocations : 0,
                skills: (editData.masterSkills || []).map(s => typeof s === 'string' ? s : s.name),
                certificates: (editData.certificates || []).map(c => ({ name: typeof c === 'string' ? c : (c.name || ''), file: null, fileData: '' })),
                projects: (editData.projects || []).map(p => ({
                    project_id: p.project_id || '',
                    project_role: p.project_role || '',
                    project_allocation: typeof p.project_allocation === 'number' ? p.project_allocation : 0,
                    project_start_date: p.project_start_date || '',
                    project_end_date: p.project_end_date || ''
                }))
            });
            setShowPreview(true);
            setCompletedSections(['personal', 'professional', 'project', 'preview']);
        }
    }, [isEditMode, editData]);

    const sections = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'project', label: 'Project', icon: FolderKanban },
        { id: 'preview', label: 'Preview', icon: Check }
    ];

    const departments = [
        'Software Engineering', 'Data Engineering', 'Quality Engineering',
        'Cloud Solutions Engineering', 'System Operations', 'Product Engineering',
        'Security Engineering', 'US Staffing', 'Business Development',
        'Training & Development', 'HR', 'Finance', 'PMO', 'Management'
    ];
    const locations = ['USA', 'Coimbatore', 'Canada', 'Malaysia', 'Chennai'];

    // Department-based skill suggestions
    const departmentSkills = {
        'Software Engineering': ['React', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Git', 'C++', 'Go', 'Rust', 'Angular', 'Vue.js'],
        'Data Engineering': ['Python', 'SQL', 'Spark', 'Hadoop', 'Kafka', 'Airflow', 'ETL', 'Data Warehousing', 'AWS', 'Azure', 'Snowflake', 'BigQuery'],
        'Quality Engineering': ['Selenium', 'Cypress', 'TestNG', 'JUnit', 'Automation Testing', 'Manual Testing', 'API Testing', 'Performance Testing', 'Jira', 'BDD', 'TDD'],
        'Cloud Solutions Engineering': ['AWS', 'Azure', 'Google Cloud', 'Terraform', 'Kubernetes', 'Docker', 'CI/CD', 'DevOps', 'Serverless', 'CloudFormation', 'Ansible'],
        'System Operations': ['Linux', 'Windows Server', 'Monitoring', 'Shell Scripting', 'Networking', 'Troubleshooting', 'ITIL', 'Jenkins', 'Nagios', 'Splunk'],
        'Product Engineering': ['Product Management', 'Agile', 'Scrum', 'User Research', 'Roadmapping', 'Analytics', 'Jira', 'Figma', 'Requirements Analysis'],
        'Security Engineering': ['Cybersecurity', 'Penetration Testing', 'SIEM', 'Firewall', 'Encryption', 'Compliance', 'Risk Assessment', 'Security Audits', 'SOC'],
        'US Staffing': ['Recruitment', 'Sourcing', 'ATS', 'LinkedIn Recruiting', 'Stakeholder Management', 'Vendor Management', 'Negotiation'],
        'Business Development': ['Lead Generation', 'Sales', 'CRM', 'Salesforce', 'Negotiation', 'B2B Sales', 'Proposal Writing', 'Client Relations'],
        'Training & Development': ['Training Delivery', 'Curriculum Design', 'L&D', 'Employee Engagement', 'Coaching', 'Presentation Skills', 'Learning Management Systems'],
        'HR': ['Recruitment', 'Employee Relations', 'Performance Management', 'HR Analytics', 'Compensation', 'HRIS', 'Payroll', 'Compliance'],
        'Finance': ['Accounting', 'Financial Analysis', 'Excel', 'SAP', 'Budgeting', 'Tax Planning', 'Financial Reporting', 'Auditing'],
        'PMO': ['Project Management', 'PMP', 'Agile', 'Scrum', 'Risk Management', 'Stakeholder Management', 'MS Project', 'Gantt Charts', 'Resource Planning'],
        'Management': ['Leadership', 'Strategic Planning', 'Team Management', 'Decision Making', 'Communication', 'Change Management', 'Business Strategy']
    };

    // Get all unique skills
    const allSkills = Array.from(new Set(Object.values(departmentSkills).flat())).sort();

    // Get suggested skills based on selected department
    const suggestedSkills = formData.department ? departmentSkills[formData.department] || [] : [];
    const otherSkills = allSkills.filter(skill => !suggestedSkills.includes(skill));

    // Filter skills based on search
    const filteredSuggestedSkills = suggestedSkills.filter(skill =>
        skill.toLowerCase().includes(skillSearch.toLowerCase())
    );
    const filteredOtherSkills = otherSkills.filter(skill =>
        skill.toLowerCase().includes(skillSearch.toLowerCase())
    );

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // Handle skills multi-select
            if (name === 'skills') {
                const skill = value;
                setFormData(prev => ({
                    ...prev,
                    skills: checked
                        ? [...prev.skills, skill]
                        : prev.skills.filter(s => s !== skill)
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo_url: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCertificateUpload = (index, file) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const updatedCerts = [...formData.certificates];
                updatedCerts[index] = {
                    ...updatedCerts[index],
                    file: file,
                    fileData: reader.result
                };
                setFormData(prev => ({ ...prev, certificates: updatedCerts }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCertificateName = (index, name) => {
        const updatedCerts = [...formData.certificates];
        updatedCerts[index] = { ...updatedCerts[index], name };
        setFormData(prev => ({ ...prev, certificates: updatedCerts }));
    };

    const addCertificate = () => {
        setFormData(prev => ({
            ...prev,
            certificates: [...prev.certificates, { name: '', file: null, fileData: '' }]
        }));
    };

    const removeCertificate = (index) => {
        setFormData(prev => ({
            ...prev,
            certificates: prev.certificates.filter((_, i) => i !== index)
        }));
    };

    const handleProjectChange = (field, value) => {
        setCurrentProject(prev => ({ ...prev, [field]: value }));
    };

    const addProject = () => {
        if (currentProject.project_id && currentProject.project_allocation > 0) {
            setFormData(prev => ({
                ...prev,
                projects: [...prev.projects, { ...currentProject }]
            }));
            setCurrentProject({
                project_id: '',
                project_role: '',
                project_allocation: 0,
                project_start_date: '',
                project_end_date: ''
            });
        }
    };

    const removeProject = (index) => {
        setFormData(prev => ({
            ...prev,
            projects: prev.projects.filter((_, i) => i !== index)
        }));
    };

    // Validation functions for each section
    const validatePersonalSection = () => {
        return (
            formData.employee_id?.trim() &&
            formData.employee_name?.trim() &&
            formData.email?.trim() &&
            formData.date_of_joining
        );
    };

    const validateProfessionalSection = () => {
        return (
            formData.role_designation?.trim() &&
            formData.department &&
            formData.location &&
            formData.work_mode &&
            formData.employment_type &&
            formData.skills.length > 0
        );
    };

    const validateProjectSection = () => {
        // Project section is optional, always allow proceeding
        return true;
    };

    const canProceedToNext = () => {
        switch (currentSection) {
            case 'personal':
                return validatePersonalSection();
            case 'professional':
                return validateProfessionalSection();
            case 'project':
                return validateProjectSection();
            default:
                return true;
        }
    };

    // Auto-calculate status and allocation based on project selection
    useEffect(() => {
        // Calculate total allocation from all projects
        const totalAllocation = formData.projects.reduce((sum, project) => {
            return sum + (parseInt(project.project_allocation) || 0);
        }, 0);

        if (formData.projects.length > 0 && totalAllocation > 0) {
            // If project is assigned with allocation, set status to Allocated
            setFormData(prev => ({
                ...prev,
                employee_status: 'Allocated',
                employee_allocations: totalAllocation
            }));
        } else {
            // If no project assigned, set to Bench
            setFormData(prev => ({
                ...prev,
                employee_status: 'Bench',
                employee_allocations: 0
            }));
        }
    }, [formData.projects]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                employee_id: formData.employee_id,
                employee_name: formData.employee_name,
                email: formData.email,
                phone: formData.phone || '',
                date_of_birth: formData.date_of_birth || null,
                address: formData.address || null,
                photo_url: formData.photo_url || null,
                date_of_joining: formData.date_of_joining,
                role_designation: formData.role_designation,
                department: formData.department,
                employment_type: formData.employment_type,
                location: formData.location,
                work_mode: formData.work_mode,
                employee_status: formData.employee_status,
                employee_allocations: formData.employee_allocations,
                skills: formData.skills,
                certificates: formData.certificates.map(c => ({ name: typeof c === 'string' ? c : (c.name || '') })),
                projects: formData.projects.map(p => ({
                    ...p,
                    project_end_date: p.project_end_date || null
                }))
            };

            if (isEditMode) {
                await updateEmployee(formData.employee_id, payload);
            } else {
                await createEmployee(payload);
            }

            navigate('/info/employee');
        } catch (error) {
            console.error('Error saving employee:', error);
            const detail = error.response?.data?.detail;
            const errorMsg = typeof detail === 'string' 
                ? detail 
                : (typeof detail === 'object' ? JSON.stringify(detail) : error.message);
            alert('Failed to save employee. ' + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const renderPersonalSection = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Employee ID *</label>
                    <input
                        type="text"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="EMP001"
                        required
                        disabled={isEditMode}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                    <input
                        type="text"
                        name="employee_name"
                        value={formData.employee_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="john.doe@company.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+91 9876543210"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                    <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Date of Joining *</label>
                    <input
                        type="date"
                        name="date_of_joining"
                        value={formData.date_of_joining}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Address</label>
                <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full address"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Profile Photo</label>
                <div className="flex items-start gap-4">
                    {/* Image Preview */}
                    <div className="flex-shrink-0">
                        {formData.photo_url ? (
                            <img
                                src={formData.photo_url}
                                alt="Preview"
                                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <User size={32} className="text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex-1">
                        <input
                            type="file"
                            id="photo-upload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <label
                            htmlFor="photo-upload"
                            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            Upload Photo
                        </label>
                        {formData.photo_url && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                                className="ml-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Remove
                            </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Supported formats: JPG, PNG, GIF (Max 2MB)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProfessionalSection = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Designation *</label>
                    <input
                        type="text"
                        name="role_designation"
                        value={formData.role_designation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Senior Developer"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Department *</label>
                    <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Employment Type *</label>
                    <select
                        name="employment_type"
                        value={formData.employment_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Full-time">Full-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Location *</label>
                    <select
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    >
                        <option value="">Select Location</option>
                        {locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Work Mode</label>
                    <select
                        name="work_mode"
                        value={formData.work_mode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Office">Office</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-600">
                        {formData.employee_status}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated based on project allocation</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Allocation %</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-600">
                        {formData.employee_allocations}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated from project assignment</p>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Skills *</label>

                {/* Click-to-open dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left flex items-center justify-between hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <span className="text-gray-600">
                            {formData.skills.length > 0
                                ? `${formData.skills.length} skill(s) selected`
                                : 'Click to select skills'}
                        </span>
                        <span className="text-gray-400">{isSkillsOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* Dropdown panel */}
                    {isSkillsOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
                            {/* Search */}
                            <div className="p-2 border-b">
                                <input
                                    type="text"
                                    placeholder="Search skills..."
                                    value={skillSearch}
                                    onChange={(e) => setSkillSearch(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            {/* Scrollable content */}
                            <div className="max-h-72 overflow-y-auto p-2">
                                {/* Suggested skills */}
                                {formData.department && filteredSuggestedSkills.length > 0 && (
                                    <div className="mb-2 p-2 bg-blue-50 rounded">
                                        <p className="text-xs font-bold text-blue-700 mb-2">✨ Suggested for {formData.department}</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {filteredSuggestedSkills.map(skill => (
                                                <label key={skill} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-blue-100 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        name="skills"
                                                        value={skill}
                                                        checked={formData.skills.includes(skill)}
                                                        onChange={handleInputChange}
                                                        className="rounded text-blue-500 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700">{skill}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other skills */}
                                {filteredOtherSkills.length > 0 && (
                                    <div>
                                        {formData.department && <p className="text-xs font-bold text-gray-600 mb-2">All Skills</p>}
                                        <div className="grid grid-cols-3 gap-2">
                                            {filteredOtherSkills.map(skill => (
                                                <label key={skill} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        name="skills"
                                                        value={skill}
                                                        checked={formData.skills.includes(skill)}
                                                        onChange={handleInputChange}
                                                        className="rounded text-blue-500 focus:ring-blue-500"
                                                    />
                                                    <span className="text-gray-700">{skill}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredSuggestedSkills.length === 0 && filteredOtherSkills.length === 0 && (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No skills found matching "{skillSearch}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected skills display */}
                <p className="text-xs text-gray-500 mt-1">
                    Selected ({formData.skills.length}): {formData.skills.join(', ') || 'None'}
                </p>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Certificates</label>

                {/* Certificates list */}
                {formData.certificates.map((cert, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                        <div className="col-span-5">
                            <input
                                type="text"
                                placeholder="Certificate name"
                                value={cert.name}
                                onChange={(e) => handleCertificateName(index, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="col-span-5">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleCertificateUpload(index, e.target.files[0])}
                                className="w-full text-sm"
                            />
                            {cert.file && <span className="text-xs text-green-600">✓ {cert.file.name}</span>}
                        </div>
                        <div className="col-span-2">
                            <button
                                type="button"
                                onClick={() => removeCertificate(index)}
                                className="w-full px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addCertificate}
                    className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 transition-colors font-medium"
                >
                    + Add Certificate
                </button>
            </div>
        </div>
    );

    const renderProjectSection = () => (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can assign multiple projects to this employee. Leave empty to assign projects later.
                </p>
            </div>

            {/* Current Project Form */}
            <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Add Project Assignment</h4>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Project</label>
                        <select
                            value={currentProject.project_id}
                            onChange={(e) => handleProjectChange('project_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select Project</option>
                            <option value="PRJ001">Project Alpha - Web Development</option>
                            <option value="PRJ002">Project Beta - Mobile App</option>
                            <option value="PRJ003">Project Gamma - Cloud Migration</option>
                            < option value="PRJ004">Project Delta - Data Analytics</option>
                            <option value="PRJ005">Project Epsilon - AI Integration</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Role in Project</label>
                            <input
                                type="text"
                                value={currentProject.project_role}
                                onChange={(e) => handleProjectChange('project_role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Developer, Lead, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Allocation %</label>
                            <input
                                type="number"
                                value={currentProject.project_allocation}
                                onChange={(e) => handleProjectChange('project_allocation', parseInt(e.target.value) || 0)}
                                min="0"
                                max="100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={currentProject.project_start_date}
                                onChange={(e) => handleProjectChange('project_start_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">End Date (Optional)</label>
                            <input
                                type="date"
                                value={currentProject.project_end_date}
                                onChange={(e) => handleProjectChange('project_end_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={addProject}
                        disabled={!currentProject.project_id || currentProject.project_allocation <= 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                        + Add Project
                    </button>
                </div>
            </div>

            {/* Assigned Projects List */}
            {formData.projects.length > 0 && (
                <div className="border border-gray-300 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Assigned Projects ({formData.projects.length})</h4>
                    <div className="space-y-2">
                        {formData.projects.map((project, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{project.project_id}</p>
                                    <p className="text-xs text-gray-600">{project.project_role} · {project.project_allocation}% allocation</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeProject(index)}
                                    className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                        Total Allocation: <span className="font-semibold">{formData.employee_allocations}%</span>
                    </p>
                </div>
            )}
        </div>
    );

    const renderPreviewSection = () => (
        <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Personal Information</h3>
                    <button
                        type="button"
                        onClick={() => setCurrentSection('personal')}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 font-medium transition-colors"
                    >
                        Edit
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Employee ID:</span> {formData.employee_id || 'N/A'}</div>
                    <div><span className="font-semibold">Name:</span> {formData.employee_name || 'N/A'}</div>
                    <div><span className="font-semibold">Email:</span> {formData.email || 'N/A'}</div>
                    <div><span className="font-semibold">Phone:</span> {formData.phone || 'N/A'}</div>
                    <div><span className="font-semibold">Date of Birth:</span> {formData.date_of_birth || 'N/A'}</div>
                    <div><span className="font-semibold">Joining Date:</span> {formData.date_of_joining || 'N/A'}</div>
                </div>
                {formData.photo_url && (
                    <div className="mt-4">
                        <img src={formData.photo_url} alt="Employee" className="w-24 h-24 rounded-lg object-cover border border-gray-300" />
                    </div>
                )}
            </div>

            {/* Professional Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Professional Information</h3>
                    <button
                        type="button"
                        onClick={() => setCurrentSection('professional')}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 font-medium transition-colors"
                    >
                        Edit
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Designation:</span> {formData.role_designation || 'N/A'}</div>
                    <div><span className="font-semibold">Department:</span> {formData.department || 'N/A'}</div>
                    <div><span className="font-semibold">Location:</span> {formData.location || 'N/A'}</div>
                    <div><span className="font-semibold">Work Mode:</span> {formData.work_mode || 'N/A'}</div>
                    <div><span className="font-semibold">Employment Type:</span> {formData.employment_type || 'N/A'}</div>
                    <div><span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded text-xs ${formData.employee_status === 'Allocated' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{formData.employee_status}</span></div>
                    <div><span className="font-semibold">Allocation:</span> {formData.employee_allocations}%</div>
                </div>
                {formData.skills.length > 0 && (
                    <div className="mt-3">
                        <span className="font-semibold text-sm">Skills:</span>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            {formData.skills.map(skill => (
                                <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{skill}</span>
                            ))}
                        </div>
                    </div>
                )}
                {formData.certificates.length > 0 && (
                    <div className="mt-3">
                        <span className="font-semibold text-sm">Certificates:</span>
                        <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                            {formData.certificates.map((cert, i) => (
                                <li key={i}>{cert.name} {cert.file && <span className="text-xs text-green-600">✓</span>}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Projects */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Projects ({formData.projects.length})</h3>
                    <button
                        type="button"
                        onClick={() => setCurrentSection('project')}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 font-medium transition-colors"
                    >
                        Edit
                    </button>
                </div>
                {formData.projects.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-2 border">Project</th>
                                <th className="text-left p-2 border">Role</th>
                                <th className="text-left p-2 border">Allocation</th>
                                <th className="text-left p-2 border">Dates</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.projects.map((project, i) => (
                                <tr key={i} className="border-t">
                                    <td className="p-2 border">{project.project_id}</td>
                                    <td className="p-2 border">{project.project_role}</td>
                                    <td className="p-2 border">{project.project_allocation}%</td>
                                    <td className="p-2 border text-xs">{project.project_start_date} to {project.project_end_date || 'Ongoing'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-gray-500 text-sm">No projects assigned</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h1>
                        <p className="text-gray-500 text-sm">{isEditMode ? 'Update employee details' : 'Fill in the details to onboard a new team member'}</p>
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 border-b border-gray-200 flex-shrink-0">
                {sections
                    .filter(section => section.id !== 'preview' || showPreview) // Hide preview tab until activated
                    .map((section, index) => {
                        const Icon = section.icon;

                        // Determine if this tab is accessible
                        const sectionOrder = ['personal', 'professional', 'project', 'preview'];
                        const currentIndex = sectionOrder.indexOf(currentSection);
                        const sectionIndex = sectionOrder.indexOf(section.id);

                        // Tab is accessible if:
                        // 1. It's the current section
                        // 2. It's a completed section (can go back)
                        // 3. It's the immediate next section and current is complete
                        const isCurrentSection = section.id === currentSection;
                        const isCompleted = completedSections.includes(section.id);
                        const isPreviousSection = sectionIndex < currentIndex;
                        const isAccessible = isCurrentSection || isCompleted || isPreviousSection;

                        return (
                            <button
                                key={section.id}
                                onClick={() => isAccessible && setCurrentSection(section.id)}
                                disabled={!isAccessible}
                                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${currentSection === section.id
                                    ? 'border-blue-500 text-blue-600 font-bold'
                                    : !isAccessible
                                        ? 'border-transparent text-gray-300 cursor-not-allowed opacity-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {section.label}
                            </button>
                        );
                    })}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    {currentSection === 'personal' && renderPersonalSection()}
                    {currentSection === 'professional' && renderProfessionalSection()}
                    {currentSection === 'project' && renderProjectSection()}
                    {currentSection === 'preview' && renderPreviewSection()}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 flex-shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>

                <div className="flex gap-2">
                    {currentSection !== 'personal' && (
                        <button
                            onClick={() => {
                                const idx = sections.findIndex(s => s.id === currentSection);
                                setCurrentSection(sections[idx - 1].id);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                    )}

                    {currentSection !== 'preview' ? (
                        <button
                            onClick={() => {
                                if (canProceedToNext()) {
                                    // Mark current section as completed
                                    if (!completedSections.includes(currentSection)) {
                                        setCompletedSections([...completedSections, currentSection]);
                                    }

                                    if (currentSection === 'project') {
                                        // On project section, show and navigate to preview
                                        setShowPreview(true);
                                        setCurrentSection('preview');
                                    } else {
                                        // For other sections, just go to next
                                        const idx = sections.findIndex(s => s.id === currentSection);
                                        setCurrentSection(sections[idx + 1].id);
                                    }
                                } else {
                                    alert('Please fill all required fields before proceeding.');
                                }
                            }}
                            disabled={!canProceedToNext()}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${canProceedToNext()
                                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                : 'bg-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {currentSection === 'project' ? 'Review & Submit' : 'Next'}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Check size={16} />
                            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Employee' : 'Create Employee')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddEmployee;
