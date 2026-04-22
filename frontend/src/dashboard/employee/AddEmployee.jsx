import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, FolderKanban, Check } from 'lucide-react';
import { useDataRefresh } from '../../context';
import { clearDashboardCache } from '../../api/dashboardApi';
import { createEmployee, updateEmployee, getEmployeeById, getEmployeeList } from '../../api/employeeApi';
import { fetchProjectsData } from '../../api/projectsApi';
import { DEPARTMENTS, LOCATIONS, WORK_MODES, EMPLOYMENT_TYPES } from '../../data/constants';
import { DEPARTMENT_SKILLS, ALL_SKILLS } from '../../data/skills';

const normalizeDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    try {
        return new Date(value).toISOString().slice(0, 10);
    } catch {
        return '';
    }
};

const normalizeEmploymentType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'Full Time';
    if (normalized === 'fte' || normalized === 'full-time' || normalized === 'full time') return 'Full Time';
    if (normalized === 'intern') return 'Intern';
    if (normalized === 'consultant') return 'Consultant';
    return 'Contract';
};

const normalizeWorkMode = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'Hybrid';
    if (normalized === 'onsite' || normalized === 'office') return 'Office';
    if (normalized === 'remote') return 'Remote';
    return 'Hybrid';
};

const AddEmployee = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isEditMode = location.state?.isEditMode || false;
    const editData = location.state?.editData || null;
    const editEmployeeId = location.state?.editEmployeeId || editData?.employee_id || editData?.id || null;
    const { triggerRefresh } = useDataRefresh();

    const [currentSection, setCurrentSection] = useState('personal'); // personal, professional, project, preview
    const [loading, setLoading] = useState(false);
    const [skillSearch, setSkillSearch] = useState('');
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState({
        project_id: '',
        project_role: '',
        project_allocation: 0,
        daily_hours: 0,
        project_start_date: '',
        project_end_date: ''
    });
    const [showPreview, setShowPreview] = useState(false); // Track if preview tab should be visible
    const [completedSections, setCompletedSections] = useState([]); // Track which sections are completed
    const [allEmployees, setAllEmployees] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [editingProjectIndex, setEditingProjectIndex] = useState(null);

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
        employment_type: 'Full Time',
        location: '',
        work_mode: 'Hybrid',
        employee_status: 'Bench',
        employee_allocations: 0,
        reporting_manager_id: '',
        date_of_resign: '',
        pip_start_date: '',
        pip_end_date: '',
        notice_start_date: '',
        notice_end_date: '',
        skills: [],
        certificates: [], // Array of {name: '', file: null, fileData: ''}
        shift: '',

        // Projects - now array for multiple projects
        projects: []
    });

    useEffect(() => {
        const applyEditData = (source) => {
            if (!source) return;

            setFormData({
                employee_id: source.id || source.employee_id || '',
                employee_name: source.name || source.employee_name || '',
                email: source.email || source.email_id || '',
                phone: source.phone === null || source.phone === undefined 
                    ? (source.phone_number === null || source.phone_number === undefined ? '' : String(source.phone_number))
                    : String(source.phone),
                date_of_birth: normalizeDate(source.date_of_birth),
                address: source.address || '',
                photo_url: source.photo_url || source.profilePic || '',
                date_of_joining: normalizeDate(source.joiningDate || source.date_of_joining),
                role_designation: source.designation || source.role_designation || '',
                department: source.department || '',
                employment_type: normalizeEmploymentType(source.employment_type),
                location: source.status?.location || source.location || '',
                work_mode: normalizeWorkMode(source.status?.workMode || source.work_mode || source.mode_of_work),
                employee_status: source.status?.allocated || source.employee_status || 'Bench',
                shift: source.shift || '',
                employee_allocations: typeof source.employee_allocations === 'number' ? source.employee_allocations : 0,
                reporting_manager_id: source.reporting_manager_id || '',
                date_of_resign: normalizeDate(source.date_of_resign),
                pip_start_date: normalizeDate(source.pip_start_date),
                pip_end_date: normalizeDate(source.pip_end_date),
                notice_start_date: normalizeDate(source.notice_start_date),
                notice_end_date: normalizeDate(source.notice_end_date),
                skills: (source.masterSkills || source.skills || []).map(s => typeof s === 'string' ? s : (s.name || s.skill || '')).filter(Boolean),
                certificates: (source.certificates || []).map(c => ({ name: typeof c === 'string' ? c : (c.name || ''), file: null, fileData: '' })),
                projects: (source.projects || []).map(p => ({
                    project_id: p.project_id || '',
                    project_role: p.project_role || '',
                    project_allocation: typeof p.project_allocation === 'number' ? p.project_allocation : (parseInt(p.project_allocation, 10) || 0),
                    project_start_date: normalizeDate(p.project_start_date || p.allocation_start_date || p.start_date),
                    project_end_date: normalizeDate(p.project_end_date || p.allocation_end_date || p.end_date)
                }))
            });
            setShowPreview(true);
            setCompletedSections(['personal', 'professional', 'project', 'preview']);
        };

        const loadEditData = async () => {
            if (!isEditMode) return;

            const hasRequiredIdentity = editData?.employee_name || editData?.name;
            const hasJoiningDate = editData?.date_of_joining || editData?.joiningDate;

            if (hasRequiredIdentity && hasJoiningDate) {
                applyEditData(editData);
                return;
            }

            if (!editEmployeeId) return;

            try {
                const fullEmployee = await getEmployeeById(editEmployeeId);
                applyEditData(fullEmployee);
            } catch (error) {
                console.error('Failed to load employee details for edit', error);
            }
        };

        loadEditData();
    }, [isEditMode, editData, editEmployeeId]);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const list = await getEmployeeList();
                setAllEmployees(list || []);
            } catch (err) {
                console.error('Failed to load employee list for manager dropdown', err);
            }
        };
        loadEmployees();
    }, []);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const res = await fetchProjectsData();
                setAllProjects(res?.data?.projects || []);
            } catch (err) {
                console.error('Failed to load projects list', err);
            }
        };
        loadProjects();
    }, []);

    const sections = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'project', label: 'Project', icon: FolderKanban },
        { id: 'preview', label: 'Preview', icon: Check }
    ];

    const departments = DEPARTMENTS;
    const locations = LOCATIONS;
    const departmentSkills = DEPARTMENT_SKILLS;
    const allSkills = ALL_SKILLS;

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

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 400; // Standard avatar resolution

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Export as JPEG with 0.7 quality to reduce size significantly
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }

            // Relaxed file size limit (let compressor handle large files)
            if (file.size > 10 * 1024 * 1024) {
                alert('Image size is too large (max 10MB)');
                return;
            }

            try {
                const compressedBase64 = await compressImage(file);
                setFormData(prev => ({ ...prev, photo_url: compressedBase64 }));
            } catch (err) {
                console.error("Image compression error:", err);
                alert("Failed to process image. Please try another one.");
            }
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
        if (field === 'project_allocation') {
            const pct = parseInt(value) || 0;
            const hours = (pct / 100) * 8;
            setCurrentProject(prev => ({ 
                ...prev, 
                project_allocation: pct,
                daily_hours: Math.round(hours * 100) / 100
            }));
        } else if (field === 'daily_hours') {
            const hours = parseFloat(value) || 0;
            const pct = (hours / 8) * 100;
            setCurrentProject(prev => ({ 
                ...prev, 
                daily_hours: hours,
                project_allocation: Math.round(pct)
            }));
        } else {
            setCurrentProject(prev => ({ ...prev, [field]: value }));
        }
    };

    const addProject = () => {
        if (currentProject.project_id && currentProject.project_allocation > 0) {
            if (editingProjectIndex !== null) {
                // Update existing project
                setFormData(prev => {
                    const updated = [...prev.projects];
                    updated[editingProjectIndex] = { ...currentProject };
                    return { ...prev, projects: updated };
                });
                setEditingProjectIndex(null);
            } else {
                // Add new project
                setFormData(prev => ({
                    ...prev,
                    projects: [...prev.projects, { ...currentProject }]
                }));
            }
            
            // Reset form
            setCurrentProject({
                project_id: '',
                project_role: '',
                project_allocation: 0,
                daily_hours: 0,
                project_start_date: '',
                project_end_date: ''
            });
        }
    };

    const handleEditProject = (index) => {
        const projectToEdit = formData.projects[index];
        const hours = (projectToEdit.project_allocation / 100) * 8;
        setCurrentProject({ 
            ...projectToEdit,
            daily_hours: Math.round(hours * 100) / 100
        });
        setEditingProjectIndex(index);
        
        // Scroll to project form area for better UX
        const projectForm = document.getElementById('project-assignment-form');
        if (projectForm) {
            projectForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const cancelProjectEdit = () => {
        setEditingProjectIndex(null);
        setCurrentProject({
            project_id: '',
            project_role: '',
            project_allocation: 0,
            project_start_date: '',
            project_end_date: ''
        });
    };

    const removeProject = (index) => {
        if (editingProjectIndex === index) {
            cancelProjectEdit();
        }
        setFormData(prev => ({
            ...prev,
            projects: prev.projects.filter((_, i) => i !== index)
        }));
    };

    // Validation functions for each section
    const validatePersonalSection = () => {
        const basicFields = (
            formData.employee_id?.trim() &&
            formData.employee_name?.trim() &&
            formData.email?.trim() &&
            formData.date_of_joining
        );
        
        if (!basicFields) return false;

        // If DOB is provided, DOJ must be after DOB
        if (formData.date_of_birth && formData.date_of_joining) {
            const dob = new Date(formData.date_of_birth);
            const doj = new Date(formData.date_of_joining);
            if (doj <= dob) return false;
        }

        return true;
    };

    const validateProfessionalSection = () => {
        return (
            formData.role_designation?.trim() &&
            formData.department &&
            formData.location &&
            formData.work_mode &&
            formData.employment_type &&
            formData.shift?.trim()
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

    // Auto-calculate status and allocation based on project selection.
    // Skips override for manually-pinned statuses: Notice period, PIP, Resigned.
    useEffect(() => {
        const MANUAL_STATUSES = ['notice', 'pip', 'resign'];
        setFormData(prev => {
            if (MANUAL_STATUSES.some(s => (prev.employee_status || '').toLowerCase().includes(s))) {
                return prev; // preserve manual status unchanged
            }
            const totalAllocation = prev.projects.reduce((sum, p) => sum + (parseInt(p.project_allocation) || 0), 0);
            if (prev.projects.length > 0 && totalAllocation > 0) {
                return { ...prev, employee_status: 'Allocated', employee_allocations: totalAllocation };
            }
            return { ...prev, employee_status: 'Bench', employee_allocations: 0 };
        });
    }, [formData.projects]);

    const handleSubmit = async () => {
        // Final sanity check for critical fields
        if (!formData.email?.trim() || !formData.employee_name?.trim() || !formData.employee_id?.trim()) {
            alert('Employee ID, Name, and Email are all required properties.');
            return;
        }

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
                employee_status: formData.employee_status || 'Bench',
                shift: formData.shift || '',
                employee_allocations: formData.employee_allocations || 0,
                reporting_manager_id: formData.reporting_manager_id || null,
                date_of_resign: formData.date_of_resign || null,
                pip_start_date: formData.pip_start_date || null,
                pip_end_date: formData.pip_end_date || null,
                notice_start_date: formData.notice_start_date || null,
                notice_end_date: formData.notice_end_date || null,
                skills: formData.skills,
                certificates: formData.certificates.map(c => ({ name: typeof c === 'string' ? c : (c.name || '') })),
                projects: formData.projects.map(p => ({
                    ...p,
                    project_end_date: p.project_end_date || null
                }))
            };

            if (isEditMode) {
                await updateEmployee(editEmployeeId || formData.employee_id, payload);
            } else {
                await createEmployee(payload);
            }

            triggerRefresh(); // global signal that data changed
            clearDashboardCache(); // Sync dashboard
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
                        placeholder="john.doe@organization.com"
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
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formData.date_of_birth && formData.date_of_joining && new Date(formData.date_of_joining) <= new Date(formData.date_of_birth)
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                        }`}
                        required
                    />
                    {formData.date_of_birth && formData.date_of_joining && new Date(formData.date_of_joining) <= new Date(formData.date_of_birth) && (
                        <p className="text-[10px] text-red-600 mt-1 font-bold italic anim-pulse">
                            Date of Joining must be after Date of Birth
                        </p>
                    )}
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
                            Supported formats: JPG, PNG, GIF (Auto-compressed)
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

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reporting Manager</label>
                <select
                    name="reporting_manager_id"
                    value={formData.reporting_manager_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Select Reporting Manager</option>
                    {allEmployees
                        .filter(emp => emp.employee_id !== formData.employee_id)
                        .map(emp => (
                            <option key={emp.employee_id} value={emp.employee_id}>
                                {emp.employee_name} ({emp.employee_id})
                            </option>
                        ))
                    }
                </select>
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
                        {EMPLOYMENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
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
                    <label className="block text-xs font-bold text-gray-700 mb-1">Shift Timing <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="shift"
                        value={formData.shift}
                        onChange={handleInputChange}
                        placeholder="e.g. 9:00 AM - 6:00 PM"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Work Mode</label>
                    <select
                        name="work_mode"
                        value={formData.work_mode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {WORK_MODES.map((mode) => (
                            <option key={mode} value={mode === 'Onsite' ? 'Office' : mode}>
                                {mode === 'Onsite' ? 'Office' : mode}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                    {isEditMode ? (
                        <select
                            name="employee_status"
                            value={formData.employee_status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <optgroup label="Auto-calculated">
                                <option value="Bench">Bench</option>
                                <option value="Partially bench">Partially bench</option>
                                <option value="Partially allocated">Partially allocated</option>
                                <option value="Allocated">Allocated</option>
                            </optgroup>
                            <optgroup label="Manually set">
                                <option value="Notice period">Notice period</option>
                                <option value="PIP">PIP</option>
                                <option value="Resigned">Resigned</option>
                            </optgroup>
                        </select>
                    ) : (
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-600">
                            {formData.employee_status}
                        </div>
                    )}
                    {!isEditMode && (
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated based on project allocation</p>
                    )}
                    {formData.employee_status === 'Notice period' && (
                        <div className="mt-2 space-y-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notice Start Date</label>
                                <input
                                    type="date"
                                    name="notice_start_date"
                                    value={formData.notice_start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Notice End Date</label>
                                <input
                                    type="date"
                                    name="notice_end_date"
                                    value={formData.notice_end_date}
                                    onChange={handleInputChange}
                                    min={formData.notice_start_date || undefined}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <p className="text-xs text-amber-600">Employee will automatically become Resigned after the end date.</p>
                        </div>
                    )}
                    {formData.employee_status === 'Resigned' && (
                        <div className="mt-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Resignation Date</label>
                            <input
                                type="date"
                                name="date_of_resign"
                                value={formData.date_of_resign}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    )}
                    {formData.employee_status === 'PIP' && (
                        <div className="mt-2 space-y-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">PIP Start Date</label>
                                <input
                                    type="date"
                                    name="pip_start_date"
                                    value={formData.pip_start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">PIP End Date</label>
                                <input
                                    type="date"
                                    name="pip_end_date"
                                    value={formData.pip_end_date}
                                    onChange={handleInputChange}
                                    min={formData.pip_start_date || undefined}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Skills</label>

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
            <div id="project-assignment-form" className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h4 className="text-sm font-bold text-gray-700 mb-3">
                    {editingProjectIndex !== null ? 'Edit Project Assignment' : 'Add Project Assignment'}
                </h4>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
                        <select
                            value={currentProject.project_id}
                            onChange={(e) => handleProjectChange('project_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select Project</option>
                            {allProjects.map(proj => (
                                <option key={proj.id} value={proj.id}>
                                    {proj.name} ({proj.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Role in Project <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={currentProject.project_role}
                                onChange={(e) => handleProjectChange('project_role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Developer, Lead, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Hours per Day <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                value={currentProject.daily_hours}
                                onChange={(e) => handleProjectChange('daily_hours', e.target.value)}
                                min="0"
                                max="8"
                                step="0.5"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Allocation % <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                value={currentProject.project_allocation}
                                onChange={(e) => handleProjectChange('project_allocation', e.target.value)}
                                min="0"
                                max="100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
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

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={addProject}
                            disabled={!currentProject.project_id || currentProject.project_allocation <= 0}
                            className={`px-4 py-2 text-white rounded text-sm font-medium transition-colors ${editingProjectIndex !== null ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300 disabled:cursor-not-allowed`}
                        >
                            {editingProjectIndex !== null ? 'Update Assignment' : '+ Add Project'}
                        </button>
                        
                        {editingProjectIndex !== null && (
                            <button
                                type="button"
                                onClick={cancelProjectEdit}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 font-medium transition-colors"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
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
                                    <p className="text-sm font-semibold text-gray-800">
                                        {allProjects.find(p => p.id === project.project_id)?.name || project.project_id}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {project.project_role} · {project.project_allocation}% allocation 
                                        ({Math.round((project.project_allocation / 100) * 8 * 100) / 100}h/day)
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleEditProject(index)}
                                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeProject(index)}
                                        className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
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
                    <div><span className="font-semibold">Shift:</span> {formData.shift || 'N/A'}</div>
                    <div><span className="font-semibold">Allocation:</span> {formData.employee_allocations}%</div>
                    <div><span className="font-semibold">Reporting Manager:</span> {formData.reporting_manager_id ? (() => { const mgr = allEmployees.find(e => e.employee_id === formData.reporting_manager_id); return mgr ? `${mgr.employee_name} (${mgr.employee_id})` : formData.reporting_manager_id; })() : 'N/A'}</div>
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
                {formData.certificates.length > 0 ? (
                    <div className="mt-3">
                        <span className="font-semibold text-sm">Certificates:</span>
                        <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                            {formData.certificates.map((cert, i) => (
                                <li key={i}>{cert.name} {cert.file && <span className="text-xs text-green-600">✓</span>}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="mt-3">
                        <span className="font-semibold text-sm">Certificates:</span>
                        <p className="mt-1 text-sm text-gray-500 italic">No certification</p>
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
                                    <td className="p-2 border">
                                        {allProjects.find(p => p.id === project.project_id)?.name || project.project_id}
                                    </td>
                                    <td className="p-2 border">{project.project_role}</td>
                                    <td className="p-2 border">{project.project_allocation}% ({Math.round((project.project_allocation / 100) * 8 * 100) / 100}h/day)</td>
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
                        className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                        title="Go Back"
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
