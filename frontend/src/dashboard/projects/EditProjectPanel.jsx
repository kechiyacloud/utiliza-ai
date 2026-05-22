import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Save, Trash2, Building, Users, Search, Pencil, AlertCircle, Check, ChevronDown } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';
import { fetchProjectDepartments } from '../../api/projectsApi';
import {
    fetchSimpleClients,
    createSimpleClient,
    updateSimpleClient,
    deleteSimpleClient,
    fetchPartnerClients,
    createPartnerClient,
    updatePartnerClient,
    deletePartnerClient,
} from '../../api/entitiesApi';
import { PROJECT_STATUS_OPTIONS, PROJECT_SUB_STATUS_OPTIONS } from '../../data/constants';

const DEFAULT_SOW_STATUS = 'SOW_NOT_SIGNED';

/* ──────────────────────────────────────────────────────────
   INLINE MODAL — Add / Edit / Delete confirmation
   ────────────────────────────────────────────────────────── */
const EntityModal = ({ isOpen, mode, entityLabel, initialName, onConfirm, onCancel, error }) => {
    const [name, setName] = useState(initialName || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDelete = mode === 'delete';
    const title = isDelete ? `Delete ${entityLabel}` : mode === 'edit' ? `Edit ${entityLabel}` : `Add ${entityLabel}`;
    const accentColor = isDelete ? 'red' : mode === 'edit' ? 'blue' : 'emerald';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 projects-poppins-container">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative z-[121] w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className={`px-6 pt-6 pb-4 border-b border-gray-100`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-${accentColor}-50 flex items-center justify-center`}>
                            {isDelete ? <Trash2 size={18} className={`text-${accentColor}-500`} /> :
                                mode === 'edit' ? <Pencil size={18} className={`text-${accentColor}-500`} /> :
                                    <Plus size={18} className={`text-${accentColor}-500`} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isDelete ? `This action cannot be undone.` : `Enter the ${entityLabel.toLowerCase()} name below.`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700">
                            <AlertCircle size={16} className="shrink-0" /> {error}
                        </div>
                    )}

                    {isDelete ? (
                        <p className="text-sm text-gray-600">
                            Are you sure you want to delete <strong className="text-gray-900">"{initialName}"</strong>?
                        </p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500  tracking-wider">{entityLabel} Name</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`Enter ${entityLabel.toLowerCase()} name`}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white focus:border-blue-300 transition-all font-medium text-gray-800"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onConfirm(name); } }}
                            />
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    <button type="button"
                        onClick={() => onConfirm(isDelete ? initialName : name)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-lg flex items-center gap-2
                            ${isDelete
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                : mode === 'edit'
                                    ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                            }`}>
                        {isDelete ? <><Trash2 size={14} /> Delete</> :
                            mode === 'edit' ? <><Check size={14} /> Update</> :
                                <><Plus size={14} /> Add</>}
                    </button>
                </div>
            </div>
        </div>
    );
};



const EditProjectPanel = ({ isOpen, onClose, project, onSave }) => {
    const [clients, setClients] = useState([]);
    const [partnerClients, setPartnerClients] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [entityError, setEntityError] = useState('');
    const [initialFormData, setInitialFormData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'External',
        clientType: 'Direct Client',
        client: '',
        clientId: '',
        partnerId: '',
        partnerName: 'Cloud Destination',
        departmentId: '',
        status: 'Not Started',
        subStatus: DEFAULT_SOW_STATUS,
        billable: 'Billable',
        startDate: '',
        endDate: '',
        resources: 0,
        skills: []
    });

    const [modal, setModal] = useState({ isOpen: false, mode: 'add', entityType: 'client', name: '', error: '' });
    const [availableSkills, setAvailableSkills] = useState([]);
    const [isEntitiesLoading, setIsEntitiesLoading] = useState(false);

    const [skillError, setSkillError] = useState('');
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [showNewSkillInput, setShowNewSkillInput] = useState(false);
    const [newSkillText, setNewSkillText] = useState('');

    async function loadEntities() {
        setEntityError('');
        setIsEntitiesLoading(true);
        try {
            const [clientData, partnerData, filterRes, deptRes] = await Promise.all([
                fetchSimpleClients(),
                fetchPartnerClients(),
                axios.get('/employees/filter-options'),
                fetchProjectDepartments(),
            ]);
            setClients(clientData);
            setPartnerClients(partnerData);
            setDepartments(deptRes);
            setAvailableSkills(filterRes.data?.skills || []);
        } catch {
            setEntityError('Failed to load clients/partners.');
        } finally {
            setIsEntitiesLoading(false);
        }
    }

    const normalizeSkillValue = (skill) => String(skill || '').trim().replace(/\s+/g, ' ');
    const normalizeSkillToken = (skill) => normalizeSkillValue(skill).toLowerCase();

    const skillExistsInList = (skillsList, targetSkill) => {
        const targetToken = normalizeSkillToken(targetSkill);
        return (skillsList || []).some((skill) => normalizeSkillToken(skill) === targetToken);
    };

    const findMatchingSkill = (skillsList, targetSkill) => {
        const targetToken = normalizeSkillToken(targetSkill);
        return (skillsList || []).find((skill) => normalizeSkillToken(skill) === targetToken) || null;
    };

    const addSkillToForm = async (rawSkillValue) => {
        const normalizedSkill = normalizeSkillValue(rawSkillValue);
        if (!normalizedSkill) {
            setSkillError('Skill cannot be empty.');
            return;
        }

        if (skillExistsInList(formData.skills, normalizedSkill)) {
            setSkillError(`"${normalizedSkill}" is already added.`);
            return;
        }

        let skillToAdd = findMatchingSkill(availableSkills, normalizedSkill) || normalizedSkill;
        const skillMissingInDirectory = !findMatchingSkill(availableSkills, normalizedSkill);

        if (skillMissingInDirectory) {
            setIsAddingSkill(true);
            try {
                const response = await axios.post('/projects/skills/ensure', { skill_name: normalizedSkill });
                const persistedSkill = normalizeSkillValue(response?.data?.skill_name) || normalizedSkill;
                skillToAdd = persistedSkill;
                setAvailableSkills((prev) => {
                    if (skillExistsInList(prev, persistedSkill)) return prev;
                    return [...prev, persistedSkill].sort((left, right) => left.localeCompare(right));
                });
            } catch (error) {
                const message =
                    error?.response?.data?.detail ||
                    error?.response?.data?.message ||
                    error?.message ||
                    'Failed to add skill.';
                setSkillError(message);
                setIsAddingSkill(false);
                return;
            }
            setIsAddingSkill(false);
        }

        setFormData((prev) => {
            if (skillExistsInList(prev.skills, skillToAdd)) return prev;
            return { ...prev, skills: [...prev.skills, skillToAdd] };
        });
        setSkillError('');
    };

    const handleSkillRemove = (skillToRemove) => {
        setFormData((prev) => ({
            ...prev,
            skills: prev.skills.filter((skill) => normalizeSkillToken(skill) !== normalizeSkillToken(skillToRemove)),
        }));
        setSkillError('');
    };

    const handleCreateNewSkill = async () => {
        const trimmed = newSkillText.trim();
        if (!trimmed) {
            setSkillError('Skill cannot be empty.');
            return;
        }
        await addSkillToForm(trimmed);
        setNewSkillText('');
    };

    const filteredClients = useMemo(() => {
        const isPartnerClientFlow = formData.type === 'External' && formData.clientType === 'Partner Client';
        if (!isPartnerClientFlow || !formData.partnerId) return clients;

        return clients.filter(client => {
            const linkedPartner =
                client.partner_id ??
                client.partnerId ??
                client.partner_client_id ??
                client.partnerClientId;

            if (linkedPartner === undefined || linkedPartner === null || linkedPartner === '') {
                return true;
            }
            return String(linkedPartner) === String(formData.partnerId);
        });
    }, [clients, formData.type, formData.clientType, formData.partnerId]);

    // Map raw/normalized type value → the exact string used in the <select> options
    const normalizeTypeForForm = (t) => {
        if (!t) return 'External';
        const lc = t.toLowerCase();
        if (lc.includes('external') || lc.includes('client')) return 'External';
        if (lc.includes('internal')) return 'Internal';
        if (lc.includes('partner')) return 'Partner';
        if (lc.includes('poc')) return 'POC';
        return 'External'; // Default to External for safety if unknown
    };

    // Map billable value → exactly 'Billable' or 'Non-Billable'
    const normalizeBillableForForm = (b) => {
        if (!b) return 'Billable';
        const normalized = b.replace(/\s+/g, '').toLowerCase();
        if (normalized === 'non-billable' || normalized === 'nonbillable') return 'Non-Billable';
        return 'Billable';
    };

    // Map status value → one of the exact PROJECT_STATUS_OPTIONS strings
    const VALID_STATUSES = new Set(['Not Started', 'In Progress', 'On Hold', 'Completed']);
    const normalizeStatusForForm = (s) => {
        if (!s) return 'Not Started';
        if (VALID_STATUSES.has(s)) return s;
        // Try to match via the backend alias map
        const lc = s.toLowerCase();
        if (['in progress', 'live', 'running', 'active', 'ongoing'].includes(lc)) return 'In Progress';
        if (['not started', 'planned', 'upcoming'].includes(lc)) return 'Not Started';
        if (['on hold', 'delayed', 'blocked'].includes(lc)) return 'On Hold';
        if (['completed', 'closed', 'done', 'ended', 'finished', 'end'].includes(lc)) return 'Completed';
        return 'Not Started';
    };

    useEffect(() => {
        if (isOpen) {
            setSaveSuccess('');
            setSaveError('');
            setEntityError('');
            setIsSaving(false);
            setShowNewSkillInput(false);
            setNewSkillText('');
            setSkillError('');
        }
    }, [isOpen]);

    useEffect(() => {
        // Re-initialise whenever the panel opens OR the project changes.
        // This ensures that any unsaved edits are discarded when reopened
        // or successfully saved.
        if (isOpen && project) {
            const projectType = normalizeTypeForForm(project.type || project.project_type);
            const isPartner = projectType === 'Partner';
            const data = {
                name: project.name || project.project_name || '',
                type: isPartner ? 'External' : projectType,
                clientType: isPartner ? 'Partner Client' : 'Direct Client',
                client: project.client_name || project.client || '',
                clientId: project.client_id || '',
                partnerId: project.partner_id || '',
                partnerName: project.partner_name || project.partner || 'Cloud Destination',
                departmentId: project.department_id || project.department || '',
                status: normalizeStatusForForm(project.status || project.project_status),
                subStatus: (isPartner ? 'External' : projectType) === 'External'
                    ? (project.sub_status || project.subStatus || DEFAULT_SOW_STATUS)
                    : '',
                billable: normalizeBillableForForm(project.billable),
                startDate: project.start_date || project.startDate || '',
                endDate: project.end_date || project.endDate || '',
                resources: project.resource_count || project.resources || 0,
                skills: project.skills || []
            };
            setFormData(data);
            setInitialFormData(data);
            loadEntities();
        }
    }, [isOpen, project]);

    const hasProjectStarted = useMemo(() => {
        if (!project || (!project.start_date && !project.startDate)) return false;
        const start = new Date(project.start_date || project.startDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return start <= now;
    }, [project]);

    const startedWeeksAgo = useMemo(() => {
        if (!project || (!project.start_date && !project.startDate)) return 0;
        const start = new Date(project.start_date || project.startDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffTime = now - start;
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        return diffDays / 7;
    }, [project]);

    const hasChanges = useMemo(() => {
        if (!initialFormData || !formData) return false;
        return Object.keys(formData).some(key => {
            if (Array.isArray(formData[key]) && Array.isArray(initialFormData[key])) {
                if (formData[key].length !== initialFormData[key].length) return true;
                for (let i = 0; i < formData[key].length; i++) {
                    if (formData[key][i] !== initialFormData[key][i]) return true;
                }
                return false;
            }
            return formData[key] !== initialFormData[key];
        });
    }, [formData, initialFormData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setSaveSuccess('');
        const { name, value } = e.target;
        if (name === 'type') {
            const isClientType = value === 'External';
            setFormData(prev => ({
                ...prev,
                type: value,
                clientType: isClientType ? 'Direct Client' : '',
                clientId: '',
                client: '',
                partnerId: '',
                partnerName: isClientType ? 'Cloud Destination' : '',
                billable: value === 'Internal' ? 'Non-Billable' : prev.billable,
                subStatus: isClientType ? (prev.subStatus || DEFAULT_SOW_STATUS) : '',
            }));
            return;
        }
        if (name === 'clientType') {
            setFormData(prev => ({
                ...prev,
                clientType: value,
                clientId: '',
                client: '',
                partnerId: value === 'Direct Client' ? '' : prev.partnerId,
                partnerName: value === 'Direct Client' ? 'Cloud Destination' : '',
            }));
            return;
        }
        if (name === 'startDate') {
            setFormData(prev => {
                let updatedEndDate = prev.endDate;
                if (value && updatedEndDate && new Date(value) > new Date(updatedEndDate)) {
                    updatedEndDate = value;
                }
                return { ...prev, startDate: value, endDate: updatedEndDate };
            });
            return;
        }
        if (name === 'endDate') {
            setFormData(prev => {
                let newEndDate = value;
                if (prev.startDate && newEndDate && new Date(prev.startDate) > new Date(newEndDate)) {
                    newEndDate = prev.startDate;
                }
                return { ...prev, endDate: newEndDate };
            });
            return;
        }
        if (name === 'status') {
            setFormData(prev => ({
                ...prev,
                status: value,
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClientSelect = (item) => {
        setSaveSuccess('');
        setFormData(prev => ({ ...prev, clientId: String(item.id), client: item.name }));
    };

    const handlePartnerSelect = (item) => {
        setSaveSuccess('');
        setFormData(prev => ({
            ...prev,
            partnerId: String(item.id),
            partnerName: item.name,
            clientId: '',
            client: ''
        }));
    };




    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaveError('');

        if (!initialFormData) return;

        if (!hasChanges) {
            toast('No changes detected', { icon: 'ℹ️' });
            setIsSaving(false);
            onClose(); 
            return;
        }

        // Detect changed fields to support partial updates
        const changedFields = {};
        Object.keys(formData).forEach(key => {
            if (Array.isArray(formData[key]) && Array.isArray(initialFormData[key])) {
                if (formData[key].length !== initialFormData[key].length || !formData[key].every((v, i) => v === initialFormData[key][i])) {
                    changedFields[key] = formData[key];
                }
            } else if (formData[key] !== initialFormData[key]) {
                changedFields[key] = formData[key];
            }
        });

        // Validations - only validate if the relevant field is changed or critical
        if (!formData.endDate) {
            setSaveError('End date is required.');
            return;
        }
        if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
            setSaveError('End date cannot be earlier than start date.');
            return;
        }

        if (!formData.departmentId || String(formData.departmentId).trim() === '') {
            setSaveError('Department is required.');
            return;
        }

        const isInternal = formData.type === 'Internal';

        const isPartnerClientProject = formData.type === 'External' && formData.clientType === 'Partner Client';
        const isDirectClientProject = formData.type === 'External' && formData.clientType === 'Direct Client';

        // Build the payload mapping our form keys to backend keys
        // We only send a key if it was changed
        const payload = {
            project_id: project.project_id || project.id
        };

        if ('name' in changedFields) payload.project_name = formData.name;
        if ('status' in changedFields) payload.project_status = formData.status;
        if ('type' in changedFields || 'clientType' in changedFields) {
            let effectiveType = formData.type;
            if (isPartnerClientProject) effectiveType = 'Partner';
            if (isDirectClientProject) effectiveType = 'Client';
            payload.type = effectiveType;
        }

        if ('clientId' in changedFields || 'type' in changedFields) {
            payload.client_id = formData.type === 'External' ? (formData.clientId || null) : null;
        }
        if ('partnerId' in changedFields || 'type' in changedFields) {
            payload.partner_id = isPartnerClientProject ? (formData.partnerId || null) : null;
        }
        // Always send department_id if changed
        if ('departmentId' in changedFields) {
            payload.department_id = formData.departmentId || null;
        }
        if ('billable' in changedFields) payload.billable = formData.billable;
        if ('startDate' in changedFields) payload.start_date = formData.startDate;
        if ('endDate' in changedFields) payload.end_date = formData.endDate || null;
        if ('skills' in changedFields) payload.skills = formData.skills || [];
        if ('subStatus' in changedFields || 'status' in changedFields || 'type' in changedFields) {
            payload.sub_status = !isInternal ? (formData.subStatus || null) : null;
        }

        setIsSaving(true);
        console.log('Edit project Submission Payload:', payload);
        try {
            await onSave(payload);
            setSaveSuccess('Project updated successfully');
            setIsSaving(false);
            // Panel remains open automatically
        } catch (error) {
            const msg = error?.response?.data?.detail || 'Failed to save project.';
            setSaveError(msg);
            toast.error(msg);
            setIsSaving(false);
        }
    };

    const openModal = (mode, entityType = 'client') => {
        const isClient = entityType === 'client';
        const selectedId = isClient ? formData.clientId : formData.partnerId;
        const selectedName = isClient ? formData.client : formData.partnerName;

        if ((mode === 'edit' || mode === 'delete') && !selectedId) {
            setEntityError(`Select a ${entityType} to ${mode}.`);
            return;
        }

        setModal({
            isOpen: true,
            mode,
            entityType,
            name: mode === 'add' ? '' : selectedName,
            error: '',
        });
    };

    const closeModal = () => setModal({ isOpen: false, mode: 'add', entityType: 'client', name: '', error: '' });

    const handleModalConfirm = async (name) => {
        const isClient = modal.entityType === 'client';
        const trimmedName = (name || '').trim();
        const selectedId = isClient ? formData.clientId : formData.partnerId;

        if (modal.mode !== 'delete' && !trimmedName) {
            setModal(prev => ({ ...prev, error: 'Name cannot be empty.' }));
            return;
        }

        try {
            if (modal.mode === 'add') {
                if (isClient) {
                    const created = await createSimpleClient(trimmedName);
                    await loadEntities();
                    setFormData(prev => ({ ...prev, clientId: String(created.id), client: created.name }));
                } else {
                    const created = await createPartnerClient(trimmedName);
                    await loadEntities();
                    setFormData(prev => ({ ...prev, partnerId: String(created.id), partnerName: created.name }));
                }
                toast.success(`${isClient ? 'Client' : 'Partner'} added successfully`);
            } else if (modal.mode === 'edit') {
                if (isClient) {
                    const updated = await updateSimpleClient(selectedId, trimmedName);
                    await loadEntities();
                    setFormData(prev => ({ ...prev, client: updated.name }));
                } else {
                    const updated = await updatePartnerClient(selectedId, trimmedName);
                    await loadEntities();
                    setFormData(prev => ({ ...prev, partnerName: updated.name }));
                }
                toast.success(`${isClient ? 'Client' : 'Partner'} updated successfully`);
            } else if (modal.mode === 'delete') {
                if (isClient) {
                    await deleteSimpleClient(selectedId);
                    setFormData(prev => ({ ...prev, clientId: '', client: '' }));
                } else {
                    await deletePartnerClient(selectedId);
                    setFormData(prev => ({ ...prev, partnerId: '', partnerName: '' }));
                }
                await loadEntities();
            }
            setEntityError('');
            closeModal();
        } catch (error) {
            const msg = error?.response?.data?.detail || `Failed to ${modal.mode} ${modal.entityType}.`;
            setModal(prev => ({ ...prev, error: msg }));
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Edit project</h2>
                            <p className="text-xs text-gray-400">ID: {project?.id || project?.project_id}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="edit-project-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                            {saveSuccess && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 flex items-center gap-2">
                                    <Check size={16} />
                                    {saveSuccess}
                                </div>
                            )}
                            {saveError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {saveError}
                                </div>
                            )}
                            {entityError && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                                    {entityError}
                                </div>
                            )}

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 ">Project name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    maxLength={100}
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 ">Project type</label>
                                <select
                                    name="type"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-medium text-gray-700"
                                    value={formData.type}
                                    onChange={handleChange}
                                >
                                    <option value="External">External</option>
                                    <option value="Internal">Internal</option>
                                </select>
                            </div>

                            {formData.type === 'External' && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 ">Client type</label>
                                    <select
                                        name="clientType"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-medium text-gray-700"
                                        value={formData.clientType}
                                        onChange={handleChange}
                                    >
                                        <option value="Direct Client">Direct Client</option>
                                        <option value="Partner Client">Partner Client</option>
                                    </select>
                                </div>
                            )}

                            {formData.type === 'External' && formData.clientType === 'Partner Client' && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 ">Partner</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <SearchableDropdown
                                                items={partnerClients}
                                                selectedId={formData.partnerId}
                                                onSelect={handlePartnerSelect}
                                                placeholder="Select Partner"
                                                label="partners"
                                                isLoading={isEntitiesLoading}
                                            />
                                            <button type="button" onClick={() => openModal('add', 'partner')}
                                                className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Add Partner">
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" disabled={!formData.partnerId} onClick={() => openModal('edit', 'partner')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold  tracking-wider transition-colors flex items-center gap-1 ${!formData.partnerId ? 'bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed border border-gray-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button 
                                                type="button" 
                                                disabled={!formData.partnerId || (partnerClients.find(p => String(p.id) === String(formData.partnerId))?.projects?.length > 0)} 
                                                onClick={() => openModal('delete', 'partner')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold  tracking-wider transition-colors flex items-center gap-1 ${!formData.partnerId || (partnerClients.find(p => String(p.id) === String(formData.partnerId))?.projects?.length > 0) ? 'bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed border border-gray-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                title={formData.partnerId && (partnerClients.find(p => String(p.id) === String(formData.partnerId))?.projects?.length > 0) ? "Cannot delete partner with linked projects" : "Delete Partner"}>
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(formData.type === 'External') && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 ">Client</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <SearchableDropdown
                                                items={filteredClients}
                                                selectedId={formData.clientId}
                                                onSelect={handleClientSelect}
                                                placeholder="Select Client"
                                                label="clients"
                                                isLoading={isEntitiesLoading}
                                            />
                                            <button type="button" onClick={() => openModal('add')}
                                                className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Add Client">
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" disabled={!formData.clientId} onClick={() => openModal('edit')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold  tracking-wider transition-colors flex items-center gap-1 ${!formData.clientId ? 'bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed border border-gray-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button 
                                                type="button" 
                                                disabled={!formData.clientId || (clients.find(c => String(c.id) === String(formData.clientId))?.projects?.length > 0)} 
                                                onClick={() => openModal('delete')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold  tracking-wider transition-colors flex items-center gap-1 ${!formData.clientId || (clients.find(c => String(c.id) === String(formData.clientId))?.projects?.length > 0) ? 'bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed border border-gray-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                title={formData.clientId && (clients.find(c => String(c.id) === String(formData.clientId))?.projects?.length > 0) ? "Cannot delete client with linked projects" : "Delete Client"}
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Department — for ALL project types */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <SearchableDropdown
                                        items={departments}
                                        selectedId={formData.departmentId}
                                        onSelect={(item) => handleChange({ target: { name: 'departmentId', value: item.id } })}
                                        placeholder="Select Department"
                                        label="Department"
                                        isLoading={isEntitiesLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 ">Status</label>
                                <select
                                    name="status"
                                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    {PROJECT_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.type === 'External' && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 ">SOW status</label>
                                    <select
                                        name="subStatus"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        value={formData.subStatus}
                                        onChange={handleChange}
                                    >
                                        {PROJECT_SUB_STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 ">Billable</label>
                                <select
                                    name="billable"
                                    className={`p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium 
                                        ${formData.type === 'Internal' ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700 cursor-pointer'}`}
                                    value={formData.billable}
                                    onChange={handleChange}
                                    disabled={formData.type === 'Internal'}
                                >
                                    <option value="Billable">Billable</option>
                                    <option value="Non-Billable">Non-Billable</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className={`text-xs font-bold  ${hasProjectStarted ? 'text-blue-600' : 'text-gray-500'}`}>
                                        Start Date {hasProjectStarted && <span className="text-[10px] lowercase font-medium ml-1">(Started)</span>}
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-700 focus:bg-white"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        title={hasProjectStarted ? "Project has already started. Be careful when updating the start date." : ""}
                                    />
                                    {hasProjectStarted && startedWeeksAgo > 2 && (
                                        <p className="text-[10px] mt-1 font-semibold text-red-500">
                                            ⚠️ Start date cannot be changed after project has started (beyond 2-week threshold)
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 ">End date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        value={formData.endDate}
                                        min={formData.startDate || undefined}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* SKILLS MULTI-SELECT */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500  tracking-wider">Required skills</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <SearchableDropdown
                                            items={availableSkills.map(s => ({ id: s, name: s }))}
                                            selectedId={null}
                                            onSelect={(item) => { void addSkillToForm(item.name); }}
                                            onCreateNew={(skillText) => { void addSkillToForm(skillText); }}
                                            placeholder={isAddingSkill ? 'Adding skill…' : 'Search or type to add a skill'}
                                            label="skills"
                                            disabled={isAddingSkill}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        {showNewSkillInput ? (
                                            <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                                                <input
                                                    type="text"
                                                    placeholder="Enter new skill"
                                                    value={newSkillText}
                                                    onChange={(e) => setNewSkillText(e.target.value)}
                                                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white focus:border-blue-300 transition-all w-48"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            void handleCreateNewSkill();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCreateNewSkill}
                                                    disabled={isAddingSkill}
                                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {isAddingSkill ? 'Adding...' : 'Add'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewSkillInput(false); setNewSkillText(''); setSkillError(''); }}
                                                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowNewSkillInput(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors self-start mt-1 border border-blue-100/50"
                                            >
                                                <Plus size={14} /> Add Skill
                                            </button>
                                        )}
                                    </div>
                                    {skillError && (
                                        <p className="text-xs text-red-600 font-medium">{skillError}</p>
                                    )}
                                    {formData.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.skills.map((skill) => (
                                                <div key={skill} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 shadow-sm animate-in fade-in zoom-in duration-200">
                                                    {skill}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSkillRemove(skill)}
                                                        className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-white transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-project-form"
                            disabled={isSaving || !hasChanges}
                            className={`px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 
                                ${isSaving || !hasChanges ? 'bg-blue-400 opacity-60 cursor-not-allowed shadow-none' : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200'}`}
                        >
                            {isSaving ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                            ) : (
                                <><Save size={16} /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <EntityModal
                isOpen={modal.isOpen}
                mode={modal.mode}
                entityLabel={modal.entityType === 'client' ? 'Client' : 'Partner'}
                initialName={modal.name}
                onConfirm={handleModalConfirm}
                onCancel={closeModal}
                error={modal.error}
            />
        </>
    );
};

export default EditProjectPanel;
