import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Save, Trash2, Building, Users, Search, Pencil, AlertCircle, Check, Info } from 'lucide-react';
import axios from '../../api/axios';
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
import { DEPARTMENTS, PROJECT_STATUS_OPTIONS } from '../../data/constants';

/* ──────────────────────────────────────────────────────────
   HELPERS — for Last 4 Weeks visualization
   ────────────────────────────────────────────────────────── */
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function fmtDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function getLast4Weeks() {
    const today = new Date();
    const thisMonday = getMonday(today);
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
        const monday = new Date(thisMonday);
        monday.setDate(thisMonday.getDate() - i * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wk = getISOWeekNumber(monday);
        weeks.push({
            label: i === 0 ? `This Week` : `Week -${i}`,
            dateRange: `${fmtDate(monday)} – ${fmtDate(sunday)}`,
            weekNum: wk,
            year: monday.getFullYear()
        });
    }
    return weeks;
}


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
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md mx-4 overflow-hidden animate-in">
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
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{entityLabel} Name</label>
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


/* ──────────────────────────────────────────────────────────
   SEARCHABLE DROPDOWN  —  scrollable + filterable
   ────────────────────────────────────────────────────────── */
const SearchableDropdown = ({ items, selectedId, onSelect, placeholder, label, disabled = false, noResultsText = 'No results found', size = 'md' }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });

    const selectedItem = items.find(i => String(i.id) === String(selectedId));
    const filtered = items.filter(i => (i.name || '').toLowerCase().includes(search.toLowerCase()));

    const syncPosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMenuStyle({
            top: rect.bottom, // Use fixed positioning relative to viewport
            left: rect.left,
            width: rect.width
        });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target) && (!menuRef.current || !menuRef.current.contains(e.target))) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            syncPosition();
            // Capture phase useful for catching scroll events from parent containers
            window.addEventListener('scroll', syncPosition, true);
            window.addEventListener('resize', syncPosition);
        }
        return () => {
            window.removeEventListener('scroll', syncPosition, true);
            window.removeEventListener('resize', syncPosition);
        };
    }, [isOpen]);

    const isSm = size === 'sm';

    return (
        <div ref={containerRef} className="relative flex-1">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full bg-white border outline-none text-left transition-all flex items-center justify-between gap-1.5
                    ${isSm ? 'px-2 py-1.5 text-xs rounded-md font-normal' : 'p-2.5 text-sm rounded-lg font-medium'}
                    ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200' : ''}
                    ${!disabled && isOpen ? 'ring-2 ring-blue-50 border-blue-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <span className={`truncate ${selectedItem ? 'text-slate-800' : 'text-slate-400'}`}>
                    {selectedItem ? selectedItem.name : placeholder || `Select ${label}`}
                </span>
                <Search size={isSm ? 12 : 14} className="text-gray-400 shrink-0" />
            </button>

            {/* Dropdown List via Portal */}
            {!disabled && isOpen && createPortal(
                <div 
                    ref={menuRef}
                    style={{
                        position: 'fixed', // Break out of all containers
                        top: `${menuStyle.top + 4}px`,
                        left: `${menuStyle.left}px`,
                        width: `${menuStyle.width}px`,
                        zIndex: 9999
                    }}
                    className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
                >
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50/30">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${label}...`}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-10 text-center text-xs text-gray-400 italic">No {label} matched your search</div>
                        ) : (
                            filtered.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => {
                                        onSelect(item);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full px-4 py-3 text-left text-xs transition-all flex items-center gap-2 rounded-lg mb-0.5 last:mb-0
                                        ${String(item.id) === String(selectedId)
                                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                                            : 'text-gray-700 hover:bg-slate-50 hover:text-blue-600 font-medium'
                                        }`}
                                >
                                    {String(item.id) === String(selectedId) && <Check size={14} className="text-blue-500" />}
                                    <span className="truncate">{item.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};


/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT — AddProjectPanel
   ══════════════════════════════════════════════════════════ */
const AddProjectPanel = ({ isOpen, onClose, onAdd }) => {
    const DIRECT_CLIENT_TYPE = 'Direct Client';
    const PARTNER_CLIENT_TYPE = 'Partner Client';
    const CLOUD_DESTINATION_PARTNER = 'Cloud Destination';

    // --- Form State ---
    const [formData, setFormData] = useState({
        name: '',
        type: 'External',
        clientType: DIRECT_CLIENT_TYPE,
        clientId: '',
        clientName: '',
        partnerId: '',
        partnerName: CLOUD_DESTINATION_PARTNER,
        department: '',
        billable: 'Billable',
        status: 'Not Started',
        startDate: '',
        endDate: '',
        teamMembers: []
    });

    const [clients, setClients] = useState([]);
    const [partnerClients, setPartnerClients] = useState([]);
    const [employees, setEmployees] = useState([]);   // [{employee_id, employee_name, role_designation}]
    const [rolesList, setRolesList] = useState([]);   // flat list of unique role strings

    // --- UI State ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [entityError, setEntityError] = useState('');

    // --- Modal State ---
    const [modal, setModal] = useState({ isOpen: false, mode: 'add', entityType: 'client', name: '', error: '' });

    async function loadEntities() {
        setEntityError('');
        try {
            const [clientData, partnerData, empRes, rolesRes] = await Promise.all([
                fetchSimpleClients(),
                fetchPartnerClients(),
                axios.get('/employees/list'),
                axios.get('/employees/roles'),
            ]);
            setClients(clientData);
            setPartnerClients(partnerData);
            setEmployees(empRes.data || []);
            // roles API returns { department: [roles] }; flatten into unique sorted list
            const allRoles = new Set();
            Object.values(rolesRes.data || {}).forEach(arr => arr.forEach(r => allRoles.add(r)));
            setRolesList(Array.from(allRoles).sort());
        } catch {
            setEntityError('Failed to load clients/partner clients.');
        }
    }

    // Fetch initial data
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) {
            setSubmitError('');
            setEntityError('');
            setFormData({
                name: '',
                type: 'External',
                clientType: DIRECT_CLIENT_TYPE,
                clientId: '',
                clientName: '',
                partnerId: '',
                partnerName: CLOUD_DESTINATION_PARTNER,
                department: '',
                billable: 'Billable',
                status: 'Not Started',
                startDate: '',
                endDate: '',
                teamMembers: []
            });
            loadEntities();
        }
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'type') {
            const isClientType = value === 'External';
            setFormData(prev => ({
                ...prev,
                type: value,
                clientType: isClientType ? DIRECT_CLIENT_TYPE : '',
                clientId: '',
                clientName: '',
                partnerId: '',
                partnerName: isClientType ? CLOUD_DESTINATION_PARTNER : '',
                department: value === 'Internal' ? prev.department : '',
                billable: value === 'Internal' ? 'Non-Billable' : prev.billable,
            }));
            return;
        }
        if (name === 'clientType') {
            setFormData(prev => ({
                ...prev,
                clientType: value,
                clientId: '',
                clientName: '',
                partnerId: value === DIRECT_CLIENT_TYPE ? '' : prev.partnerId,
                partnerName: value === DIRECT_CLIENT_TYPE ? CLOUD_DESTINATION_PARTNER : '',
            }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClientSelect = (item) => {
        setFormData(prev => ({ ...prev, clientId: String(item.id), clientName: item.name }));
    };

    const handlePartnerSelect = (item) => {
        setFormData(prev => ({
            ...prev,
            partnerId: String(item.id),
            partnerName: item.name,
            clientId: '',
            clientName: '',
        }));
    };

    const hasPartnerMappedClients = useMemo(
        () =>
            clients.some((client) =>
                ['partner_id', 'partnerId', 'partner_client_id', 'partnerClientId'].some(
                    (key) => client[key] !== undefined && client[key] !== null
                )
            ),
        [clients]
    );

    const filteredClients = useMemo(() => {
        const isPartnerClientFlow = formData.type === 'External' && formData.clientType === PARTNER_CLIENT_TYPE;
        if (!isPartnerClientFlow || !formData.partnerId) {
            return clients;
        }

        return clients.filter((client) => {
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

    // --- Entity Modal Openers ---
    const openModal = (mode, entityType) => {
        const isClient = entityType === 'client';
        const selectedId = isClient ? formData.clientId : formData.partnerId;
        const selectedName = isClient ? formData.clientName : formData.partnerName;

        if ((mode === 'edit' || mode === 'delete') && !selectedId) {
            setEntityError(`Select a ${isClient ? 'client' : 'partner'} to ${mode}.`);
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
        const selectedId = isClient ? formData.clientId : formData.partnerId;
        const trimmedName = (name || '').trim();

        if (modal.mode !== 'delete' && !trimmedName) {
            setModal(prev => ({ ...prev, error: 'Name cannot be empty.' }));
            return;
        }

        try {
            if (modal.mode === 'add') {
                const created = isClient
                    ? await createSimpleClient(trimmedName)
                    : await createPartnerClient(trimmedName);
                await loadEntities();
                if (isClient) {
                    setFormData(prev => ({ ...prev, clientId: String(created.id), clientName: created.name }));
                } else {
                    setFormData(prev => ({ ...prev, partnerId: String(created.id), partnerName: created.name }));
                }
            } else if (modal.mode === 'edit') {
                const updated = isClient
                    ? await updateSimpleClient(selectedId, trimmedName)
                    : await updatePartnerClient(selectedId, trimmedName);
                await loadEntities();
                if (isClient) {
                    setFormData(prev => ({ ...prev, clientName: updated.name }));
                } else {
                    setFormData(prev => ({ ...prev, partnerName: updated.name }));
                }
            } else if (modal.mode === 'delete') {
                if (isClient) {
                    await deleteSimpleClient(selectedId);
                    setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
                } else {
                    await deletePartnerClient(selectedId);
                    setFormData(prev => ({ ...prev, partnerId: '', partnerName: '' }));
                }
                await loadEntities();
            }
            setEntityError('');
            closeModal();
        } catch (error) {
            const msg = error?.response?.data?.detail || `Failed to ${modal.mode} ${isClient ? 'client' : 'partner'}.`;
            setModal(prev => ({ ...prev, error: msg }));
        }
    };

    const handleAddTeamMember = () => {
        setFormData(prev => ({
            ...prev,
            teamMembers: [
                ...prev.teamMembers,
                { employee_id: '', name: '', role: '', company: 'Cloud Destinations', company_type: 'Internal', location: 'Remote', w1: 0, w2: 0, w3: 0, w4: 0 }
            ]
        }));
    };

    const handleEmployeeSelect = (index, emp) => {
        const newTeam = [...formData.teamMembers];
        newTeam[index] = {
            ...newTeam[index],
            employee_id: emp.employee_id,
            name: emp.employee_name,
            // Auto-fill role from employee designation if role is empty
            role: newTeam[index].role || emp.role_designation || '',
        };
        setFormData({ ...formData, teamMembers: newTeam });
    };

    const handleRoleSelect = (index, role) => {
        const newTeam = [...formData.teamMembers];
        newTeam[index].role = role;
        setFormData({ ...formData, teamMembers: newTeam });
    };

    const handleRemoveTeamMember = (index) => {
        setFormData(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.filter((_, i) => i !== index)
        }));
    };

    const handleTeamMemberChange = (index, field, value) => {
        const newTeam = [...formData.teamMembers];
        if (['w1', 'w2', 'w3', 'w4'].includes(field)) {
            newTeam[index][field] = parseInt(value) || 0;
        } else if (field === 'company_type') {
            newTeam[index][field] = value;
            if (value === 'Internal') {
                newTeam[index]['company'] = 'Cloud Destinations';
            } else {
                newTeam[index]['company'] = '';
            }
        } else {
            newTeam[index][field] = value;
        }
        setFormData({ ...formData, teamMembers: newTeam });
    };

    // --- Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!formData.name.trim()) {
            setSubmitError('Project name is required.');
            return;
        }
        if (!formData.startDate) {
            setSubmitError('Start date is required.');
            return;
        }
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            setSubmitError('End date cannot be earlier than start date.');
            return;
        }
        if (formData.type === 'External' && !formData.clientType) {
            setSubmitError('Please select a client type.');
            return;
        }
        if (formData.type === 'External' && formData.clientType === DIRECT_CLIENT_TYPE && !formData.clientId) {
            setSubmitError('Please select a client.');
            return;
        }
        if (formData.type === 'External' && formData.clientType === PARTNER_CLIENT_TYPE && !formData.partnerId) {
            setSubmitError('Please select a partner.');
            return;
        }
        if (formData.type === 'External' && formData.clientType === PARTNER_CLIENT_TYPE && !formData.clientId) {
            setSubmitError('Please select a client.');
            return;
        }

        setIsSubmitting(true);

        const projectId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
        const isPartnerClientProject = formData.type === 'External' && formData.clientType === PARTNER_CLIENT_TYPE;
        const effectiveType = isPartnerClientProject ? 'Partner' : formData.type;

        const payload = {
            project_id: projectId,
            project_name: formData.name,
            project_status: formData.status,
            type: effectiveType,
            client_id: formData.type === 'External' ? (formData.clientId || null) : null,
            client: formData.type === 'External' && !isPartnerClientProject ? (formData.clientName || null) : null,
            partner_id: isPartnerClientProject ? (formData.partnerId || null) : null,
            partner: isPartnerClientProject ? (formData.partnerName || null) : null,
            billable: formData.billable,
            start_date: formData.startDate,
            end_date: formData.endDate || null,
            team_members: formData.teamMembers
        };

        try {
            const response = await axios.post('/projects', payload);
            setIsSubmitting(false);
            if (onAdd) onAdd(response?.data || payload);
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError(err.response?.data?.detail || "Failed to create project.");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isClientProject = formData.type === 'External';
    const isDirectClient = isClientProject && formData.clientType === DIRECT_CLIENT_TYPE;
    const isPartnerClient = isClientProject && formData.clientType === PARTNER_CLIENT_TYPE;
    const entityLabel = modal.entityType === 'client' ? 'Client' : 'Partner';

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Full Screen Page Overlay */}
            <div className="fixed inset-0 w-full h-full bg-white z-50 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Add New Project</h2>
                        <p className="text-xs text-gray-500 mt-1">Configure project details and allocate team members</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    <form id="add-project-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-8">
                        {submitError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" /> {submitError}
                            </div>
                        )}
                        {entityError && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" /> {entityError}
                            </div>
                        )}

                        {/* --- TOP SECTION: Project Details --- */}
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Building size={18} className="text-blue-500" />
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Project Details</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Project Name</label>
                                    <input type="text" name="name" placeholder="e.g. Enterprise Migration" required
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-800"
                                        value={formData.name} onChange={handleChange} />
                                </div>

                                {/* TYPE DROPDOWN */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Project Type</label>
                                    <select name="type" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                        value={formData.type} onChange={handleChange}>
                                        <option value="External">External</option>
                                        <option value="Internal">Internal</option>
                                    </select>
                                </div>

                                {/* CLIENT TYPE DROPDOWN */}
                                {isClientProject && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Client Type</label>
                                        <select name="clientType" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                            value={formData.clientType} onChange={handleChange}>
                                            <option value={DIRECT_CLIENT_TYPE}>{DIRECT_CLIENT_TYPE}</option>
                                            <option value={PARTNER_CLIENT_TYPE}>{PARTNER_CLIENT_TYPE}</option>
                                        </select>
                                    </div>
                                )}

                                {/* DIRECT CLIENT PARTNER FIELD */}
                                {isDirectClient && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Partner</label>
                                        <input
                                            type="text"
                                            value={CLOUD_DESTINATION_PARTNER}
                                            disabled
                                            className="p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                )}

                                {/* PARTNER DROPDOWN + CRUD */}
                                {isPartnerClient && (
                                    <div className="flex flex-col gap-1.5 col-span-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Partner</label>
                                        <div className="flex gap-2">
                                            <SearchableDropdown
                                                items={partnerClients}
                                                selectedId={formData.partnerId}
                                                onSelect={handlePartnerSelect}
                                                placeholder="Select Partner"
                                                label="partners"
                                            />
                                            <button type="button" onClick={() => openModal('add', 'partner')}
                                                className="px-2.5 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1" title="Add Partner">
                                                <Plus size={12} /> Add
                                            </button>
                                            <button type="button" onClick={() => openModal('edit', 'partner')}
                                                className="px-2.5 py-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1" title="Edit Partner">
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button type="button" onClick={() => openModal('delete', 'partner')}
                                                className="px-2.5 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1" title="Delete Partner">
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* CLIENT DROPDOWN + CRUD */}
                                {isClientProject && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Client</label>
                                        <div className="flex gap-2">
                                            <SearchableDropdown
                                                items={filteredClients}
                                                selectedId={formData.clientId}
                                                onSelect={handleClientSelect}
                                                placeholder={isPartnerClient && hasPartnerMappedClients && !formData.partnerId ? 'Select Partner first' : 'Select Client'}
                                                label="clients"
                                                disabled={Boolean(isPartnerClient && hasPartnerMappedClients && !formData.partnerId)}
                                                noResultsText={isPartnerClient ? 'No clients available for the selected partner' : 'No results found'}
                                            />
                                            <button type="button" onClick={() => openModal('add', 'client')}
                                                className="px-2.5 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1" title="Add Client">
                                                <Plus size={12} /> Add
                                            </button>
                                            <button type="button" onClick={() => openModal('edit', 'client')}
                                                className="px-2.5 py-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1" title="Edit Client">
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button type="button" onClick={() => openModal('delete', 'client')}
                                                className="px-2.5 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1" title="Delete Client">
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* INTERNAL — Department dropdown */}
                                {formData.type === 'Internal' && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Department (Optional)</label>
                                        <select name="department" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                            value={formData.department} onChange={handleChange}>
                                            <option value="">Select Department</option>
                                            {DEPARTMENTS.map((dept) => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                                    <select name="status" className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                        value={formData.status} onChange={handleChange}>
                                        {PROJECT_STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Billable</label>
                                    <select name="billable"
                                        className={`p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium 
                                            ${formData.type === 'Internal' ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700 cursor-pointer focus:bg-white'}`}
                                        value={formData.billable} 
                                        onChange={handleChange}
                                        disabled={formData.type === 'Internal'}>
                                        <option value="Billable">Billable</option>
                                        <option value="Non-Billable">Non-Billable</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Start Date</label>
                                    <input type="date" name="startDate" required
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700"
                                        value={formData.startDate} onChange={handleChange} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase">End Date</label>
                                    <input type="date" name="endDate"
                                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700"
                                        value={formData.endDate} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* --- BOTTOM SECTION: Team Members --- */}
                        <div className="flex flex-col gap-4 mb-4 mt-8">
                            <div className="flex items-center justify-between gap-4 py-1">
                                <button 
                                    type="button" 
                                    onClick={handleAddTeamMember} 
                                    className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider hover:text-blue-600 transition-colors group shrink-0"
                                >
                                    <Plus size={18} className="text-emerald-500 group-hover:text-blue-500 transition-colors" />
                                    Add Team Member
                                </button>

                                <div className="bg-blue-50/50 border border-blue-100 rounded-full py-1 px-4 flex items-center gap-2 ml-auto shadow-sm">
                                    <Info size={14} className="text-blue-500 shrink-0" />
                                    <div className="text-[10px] text-blue-700 whitespace-nowrap">
                                        <span className="font-bold opacity-80 uppercase tracking-tight mr-1">Logic:</span> 
                                        40h Standard (100%) Plan  •  Last 4 Weeks
                                    </div>
                                </div>
                            </div>

                            {formData.teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    No team members allocated to this project yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">S.No</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Name</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Role</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Comp. Type</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Company</th>
                                                <th className="px-3 py-3 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Location</th>
                                                {getLast4Weeks().map((wk, idx) => (
                                                    <th key={idx} className="px-2 py-3 text-center min-w-[70px]">
                                                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tight">{wk.label}</div>
                                                        <div className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{wk.dateRange}</div>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.teamMembers.map((member, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 bg-white hover:bg-slate-50/40">
                                                    <td className="px-3 py-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                                                    <td className="px-2 py-2 min-w-[160px]">
                                                        {/* Employee name — searchable dropdown */}
                                                        <SearchableDropdown
                                                            items={employees.map(e => ({ id: e.employee_id, name: e.employee_name, _raw: e }))}
                                                            selectedId={member.employee_id}
                                                            onSelect={(item) => handleEmployeeSelect(idx, item._raw)}
                                                            placeholder="Select Employee"
                                                            label="employees"
                                                            size="sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[150px]">
                                                        {/* Role — searchable dropdown */}
                                                        <SearchableDropdown
                                                            items={rolesList.map(r => ({ id: r, name: r }))}
                                                            selectedId={member.role}
                                                            onSelect={(item) => handleRoleSelect(idx, item.name)}
                                                            placeholder="Select Role"
                                                            label="roles"
                                                            size="sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[100px]">
                                                        <select value={member.company_type} onChange={(e) => handleTeamMemberChange(idx, 'company_type', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer font-normal text-slate-700">
                                                            <option value="Internal">Internal</option>
                                                            <option value="Partner">Partner</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[130px]">
                                                        <input type="text" value={member.company} onChange={(e) => handleTeamMemberChange(idx, 'company', e.target.value)} disabled={member.company_type === 'Internal'} placeholder="Company Name" className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white disabled:bg-slate-50 disabled:text-slate-400" />
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[90px]">
                                                        <select value={member.location} onChange={(e) => handleTeamMemberChange(idx, 'location', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer font-normal text-slate-700">
                                                            <option value="Remote">Remote</option>
                                                            <option value="On-Site">On-Site</option>
                                                            <option value="Hybrid">Hybrid</option>
                                                        </select>
                                                    </td>
                                                    {['w1', 'w2', 'w3', 'w4'].map((wCol) => (
                                                        <td key={wCol} className="px-1 py-2 min-w-[45px]">
                                                            <input type="number" min="0" max="168" value={member[wCol]} onChange={(e) => handleTeamMemberChange(idx, wCol, e.target.value)} className="w-full px-1 py-1.5 text-xs text-center border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white" />
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-center">
                                                        <button type="button" onClick={() => handleRemoveTeamMember(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Remove">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                        Cancel
                    </button>
                    <button form="add-project-form" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</span>
                        ) : (
                            <><Save size={16} /> Create Project & Allocate</>
                        )}
                    </button>
                </div>
            </div>

            {/* Entity Modal */}
            <EntityModal
                key={`${modal.mode}-${modal.entityType}-${modal.name}-${modal.isOpen ? 'open' : 'closed'}`}
                isOpen={modal.isOpen}
                mode={modal.mode}
                entityLabel={entityLabel}
                initialName={modal.name}
                onConfirm={handleModalConfirm}
                onCancel={closeModal}
                error={modal.error}
            />
        </>
    );
};

export default AddProjectPanel;
