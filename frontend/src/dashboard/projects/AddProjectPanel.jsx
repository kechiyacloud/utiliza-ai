import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Save, Trash2, Building, Users, Search, Pencil, AlertCircle, Check, Info } from 'lucide-react';
import axios from '../../api/axios';
import {
    fetchSimpleClients,
    fetchAutocompleteClients,
    fetchClientsByPartner,
    createSimpleClient,
    updateSimpleClient,
    deleteSimpleClient,
    fetchPartnerClients,
    createPartnerClient,
    updatePartnerClient,
    deletePartnerClient,
} from '../../api/entitiesApi';
import { DEPARTMENTS, PROJECT_STATUS_OPTIONS, PROJECT_SUB_STATUS_OPTIONS } from '../../data/constants';

/* ──────────────────────────────────────────────────────────
   HELPERS — for Last 4 Weeks visualization
   ────────────────────────────────────────────────────────── */
function normalizeDateString(dateStr) {
    if (!dateStr) return '';
    const trimmed = (dateStr || '').trim();
    if (!trimmed) return '';

    // yyyy-mm-dd (already in DB-friendly format)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return trimmed;

    // dd-mm-yyyy or dd/mm/yyyy
    const altMatch = trimmed.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (altMatch) {
        const [, dd, mm, yyyy] = altMatch;
        return `${yyyy}-${mm}-${dd}`;
    }

    // Fallback: parseable date -> format to yyyy-mm-dd
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    return ''; // invalid / unrecognized
}

function toMessage(val, fallback = 'Something went wrong') {
    if (!val && val !== 0) return fallback;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
        const parts = val.map(v => toMessage(v, '')).filter(Boolean);
        return parts.join(', ') || fallback;
    }
    if (typeof val === 'object') {
        if (val.msg) return toMessage(val.msg, fallback);
        if (val.detail) return toMessage(val.detail, fallback);
        return JSON.stringify(val);
    }
    return String(val);
}

const toIdOrNull = (val) => {
    if (val === undefined || val === null) return null;
    const text = String(val).trim();
    if (!text) return null;
    if (['undefined', 'null', 'nan'].includes(text.toLowerCase())) return null;
    return text;
};

const sanitizeWeeklyHours = (wh = {}) => {
    const cleaned = {};
    Object.entries(wh || {}).forEach(([wk, hrs]) => {
        if (hrs === '' || hrs === null || hrs === undefined) return;
        const numWeek = Number(wk);
        const numHours = Number(hrs);
        if (Number.isFinite(numWeek) && Number.isFinite(numHours)) {
            cleaned[numWeek] = numHours;
        }
    });
    return cleaned;
};

const normalizeTeamMember = (tm = {}) => ({
    employee_id: tm.employee_id || null,
    name: (tm.name || '').trim(),
    role: (tm.role || '').trim(),
    location: tm.location || 'Remote',
    allocation_pct: tm.allocation_pct === '' ? null : Number(tm.allocation_pct || 0),
    allocation_start_date: tm.allocation_start_date || null,
    allocation_end_date: tm.allocation_end_date || null,
    billable_shadow: tm.billable_shadow || 'Billable',
    weekly_hours: sanitizeWeeklyHours(tm.weekly_hours),
    w1: Number(tm.w1 || 0),
    w2: Number(tm.w2 || 0),
    w3: Number(tm.w3 || 0),
    w4: Number(tm.w4 || 0),
    project_count: tm.project_count || null,
    department: tm.department || null,
    company: tm.company || 'Cloud Destinations',
    company_type: tm.company_type || 'Internal',
});

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

/* Generate all ISO weeks between startDateStr and endDateStr (inclusive).
   Falls back to 12 weeks from start if endDateStr is missing. */
function getProjectWeeks(startDateStr, endDateStr) {
    if (!startDateStr) return [];
    const start = new Date(startDateStr + 'T00:00:00');
    const startMonday = getMonday(start);
    let endMonday;
    if (endDateStr) {
        const end = new Date(endDateStr + 'T00:00:00');
        endMonday = getMonday(end);
    } else {
        endMonday = new Date(startMonday);
        endMonday.setDate(startMonday.getDate() + 11 * 7); // 12 weeks default
    }
    const weeks = [];
    const cursor = new Date(startMonday);
    let wIdx = 1;
    while (cursor <= endMonday) {
        const sunday = new Date(cursor);
        sunday.setDate(cursor.getDate() + 6);
        weeks.push({
            weekNum: getISOWeekNumber(cursor),
            year: cursor.getFullYear(),
            label: `W${wIdx}`,
            dateRange: `${fmtDate(cursor)} – ${fmtDate(sunday)}`,
        });
        cursor.setDate(cursor.getDate() + 7);
        wIdx++;
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
const SearchableDropdown = ({
    items,
    selectedId,
    onSelect,
    placeholder,
    label,
    disabled = false,
    noResultsText = 'No results found',
    isLoading = false,
    onBeforeOpen,
    onOpenChange,
    loadOptions,
}) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [asyncItems, setAsyncItems] = useState(items || []);
    const [asyncLoading, setAsyncLoading] = useState(false);
    const containerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });
    const requestSeqRef = useRef(0);

    const selectedPool = loadOptions ? [...asyncItems, ...(items || [])] : items;
    const selectedItem = selectedPool.find(i => String(i.id) === String(selectedId) || i.name === selectedId);
    const filtered = loadOptions
        ? asyncItems
        : items.filter(i => (i.name || '').toLowerCase().includes(search.toLowerCase()));
    const loading = isLoading || asyncLoading;

    const syncMenuPosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMenuStyle({
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
        });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            const clickedInsideTrigger = containerRef.current && containerRef.current.contains(e.target);
            const clickedInsideMenu = menuRef.current && menuRef.current.contains(e.target);
            if (!clickedInsideTrigger && !clickedInsideMenu) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (onOpenChange) onOpenChange(isOpen);
    }, [isOpen, onOpenChange]);

    useEffect(() => {
        if (!loadOptions) {
            return;
        }

        if (!isOpen) {
            setAsyncItems(items || []);
            setAsyncLoading(false);
            requestSeqRef.current += 1;
            return;
        }

        let cancelled = false;
        const requestSeq = ++requestSeqRef.current;
        const timer = window.setTimeout(async () => {
            try {
                setAsyncLoading(true);
                const result = await loadOptions(search);
                if (!cancelled && requestSeqRef.current === requestSeq) {
                    setAsyncItems(Array.isArray(result) ? result : []);
                }
            } catch (error) {
                console.error(`[SearchableDropdown:${label}] failed to load options`, error);
                if (!cancelled && requestSeqRef.current === requestSeq) {
                    setAsyncItems([]);
                }
            } finally {
                if (!cancelled && requestSeqRef.current === requestSeq) {
                    setAsyncLoading(false);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [loadOptions, isOpen, items, label, search]);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        syncMenuPosition();
        const updatePosition = () => syncMenuPosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative flex-1 min-w-0 overflow-visible">
            {/* Trigger */}
            <button
                type="button"
                onClick={async () => {
                    if (disabled) return;
                    setSearch('');
                    if (!isOpen) {
                        if (loadOptions) {
                            setAsyncItems(items || []);
                        }
                        syncMenuPosition();
                        setIsOpen(true);
                        if (onBeforeOpen) {
                            try {
                                await onBeforeOpen();
                            } catch (err) {
                                console.error(`[SearchableDropdown:${label}] pre-open load failed`, err);
                            }
                        }
                        return;
                    }
                    setIsOpen(false);
                }}
                disabled={disabled}
                className={`w-full h-10 px-3 bg-gray-50 border rounded-lg text-sm outline-none text-left font-medium transition-all flex items-center justify-between gap-2 min-w-0
                    ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : ''}
                    ${!disabled && isOpen ? 'ring-2 ring-blue-100 bg-white border-blue-300' : ''}
                    ${!disabled && !isOpen ? 'border-gray-200 hover:border-gray-300' : ''}`}
            >
                <span className={`${selectedItem ? 'text-gray-800' : 'text-gray-400'} truncate min-w-0 flex-1`}>
                    {selectedItem ? selectedItem.name : placeholder || `Select ${label}`}
                </span>
                <Search size={14} className="text-gray-400 shrink-0" />
            </button>

            {/* Dropdown List */}
            {!disabled && isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                    style={{
                        top: `${menuStyle.top}px`,
                        left: `${menuStyle.left}px`,
                        width: `${menuStyle.width}px`,
                    }}
                >
                    <div className="max-h-[240px] overflow-y-auto overflow-x-hidden overscroll-contain">
                        <div className="sticky top-0 z-10 p-2.5 border-b border-gray-100 bg-white">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Search ${label}...`}
                                    className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-200 transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="py-1">
                            {loading && filtered.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-gray-400">Loading...</div>
                            ) : filtered.length === 0 && search.trim().length > 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-gray-400">{noResultsText}</div>
                            ) : filtered.length === 0 ? (
                                <div className="px-4 py-4 text-center text-xs text-gray-300">No options available</div>
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
                                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 min-w-0
                                            ${String(item.id) === String(selectedId) || item.name === selectedId
                                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                                : 'text-gray-700 hover:bg-gray-50 font-medium'
                                            }`}
                                    >
                                        {(String(item.id) === String(selectedId) || item.name === selectedId) && <Check size={14} className="text-blue-500 shrink-0" />}
                                        <span className="truncate min-w-0">{item.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
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
const AddProjectPanel = ({ isOpen, onClose, onAdd, pageMode = false }) => {
    const DIRECT_CLIENT_TYPE = 'Direct Client';
    const PARTNER_CLIENT_TYPE = 'Partner Client';
    const CLOUD_DESTINATION_PARTNER = 'Cloud Destination';

    // --- Form State ---
    const [formData, setFormData] = useState({
        name: '',
        type: 'Client',
        clientType: DIRECT_CLIENT_TYPE,
        clientId: '',
        clientName: '',
        partnerId: '',
        partnerName: CLOUD_DESTINATION_PARTNER,
        department: '',
        billable: 'Billable',
        status: 'Not Started',
        sowStatus: '',
        startDate: '',
        endDate: '',
        teamMembers: []
    });

    const [clients, setClients] = useState([]);
    const [partnerClients, setPartnerClients] = useState([]);
    const [employees, setEmployees] = useState([]);   // [{employee_id, employee_name, role_designation}]
    const [rolesList, setRolesList] = useState([]);   // flat list of unique role strings
    const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState('');
    const [isTeamInputsActive, setIsTeamInputsActive] = useState(false);
    const teamTableRef = useRef(null);

    // --- UI State ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [entityError, setEntityError] = useState('');
    const [showAllWeeks, setShowAllWeeks] = useState(false);

    // --- Modal State ---
    const [modal, setModal] = useState({ isOpen: false, mode: 'add', entityType: 'client', name: '', error: '' });

    const loadClientsForPartner = async (partnerId) => {
        if (!partnerId) {
            setClients([]);
            setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
            return;
        }
        try {
            const data = await fetchClientsByPartner(partnerId);
            setClients(data);
            // auto-select first client if exists
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, clientId: String(data[0].id), clientName: data[0].name }));
            } else {
                setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
            }
        } catch (err) {
            console.error('[AddProjectPanel] Failed to load clients for partner', err);
            setEntityError('Failed to load clients for selected partner.');
        }
    };

    async function loadEntities() {
        setEntityError('');
        setIsDirectoryLoading(true);
        try {
            const [clientResult, partnerResult, employeesResult, rolesResult] = await Promise.allSettled([
                fetchSimpleClients(),
                fetchPartnerClients(),
                axios.get('/employees/list'),
                axios.get('/employees/departments/roles-mapping'),
            ]);

            if (clientResult.status === 'fulfilled') {
                setClients(clientResult.value);
            } else {
                console.error('[AddProjectPanel] Failed to load clients', clientResult.reason);
            }

            if (partnerResult.status === 'fulfilled') {
                setPartnerClients(partnerResult.value);
            } else {
                console.error('[AddProjectPanel] Failed to load partner clients', partnerResult.reason);
            }

            if (employeesResult.status === 'fulfilled') {
                const employeesFromApi = employeesResult.value?.data || [];
                setEmployees(employeesFromApi);
                console.log('[AddProjectPanel] employees/list count:', employeesFromApi.length);
                console.log('[AddProjectPanel] employees/list sample:', employeesFromApi.slice(0, 3).map((e) => ({
                    employee_id: e?.employee_id,
                    employee_name: e?.employee_name,
                    role_designation: e?.role_designation
                })));
            } else {
                console.error('[AddProjectPanel] Failed to load employees', employeesResult.reason);
            }

            if (rolesResult.status === 'fulfilled') {
                // roles API returns { department: [roles] }; flatten into unique sorted list
                const allRoles = new Set();
                Object.values(rolesResult.value?.data || {}).forEach(arr => arr.forEach(r => allRoles.add(r)));
                const flattenedRoles = Array.from(allRoles).sort();
                setRolesList(flattenedRoles);
                console.log('[AddProjectPanel] employees/roles count:', flattenedRoles.length);
                console.log('[AddProjectPanel] employees/roles sample:', flattenedRoles.slice(0, 10));
            } else {
                console.error('[AddProjectPanel] Failed to load roles mapping', rolesResult.reason);
            }

        } catch (error) {
            console.error('[AddProjectPanel] Failed to load dropdown entities', error);
            setEntityError('Failed to load clients/partner clients.');
        } finally {
            setIsDirectoryLoading(false);
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
                type: 'Client',
                clientType: DIRECT_CLIENT_TYPE,
                clientId: '',
                clientName: '',
                partnerId: '',
                partnerName: CLOUD_DESTINATION_PARTNER,
                department: '',
                billable: 'Billable',
                status: 'Not Started',
                sowStatus: '',
                startDate: '',
                endDate: '',
                teamMembers: []
            });
            loadEntities();
        }
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        const isPartnerFlow = formData.type === 'Client' && formData.clientType === PARTNER_CLIENT_TYPE;
        if (isPartnerFlow && formData.partnerId) {
            loadClientsForPartner(formData.partnerId);
        }
        if (isPartnerFlow && !formData.partnerId) {
            setClients([]);
            setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
        }
    }, [formData.type, formData.clientType, formData.partnerId]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'type') {
            const isClientType = value === 'Client';
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
        if (name === 'status') {
            setFormData(prev => ({
                ...prev,
                status: value,
                sowStatus: value === 'In Progress' ? prev.sowStatus : '',
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
        loadClientsForPartner(item.id);
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
        const isPartnerClientFlow = formData.type === 'Client' && formData.clientType === PARTNER_CLIENT_TYPE;
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

    const employeeOptions = useMemo(
        () =>
            (employees || [])
                .filter(e => e?.employee_id && e?.employee_name)
                .map(e => ({ id: e.employee_id, name: e.employee_name, _raw: e })),
        [employees]
    );

    const roleOptions = useMemo(() => {
        const roleSet = new Set();

        const addRole = (value) => {
            const role = String(value || '').trim();
            if (role) roleSet.add(role);
        };

        if (Array.isArray(rolesList)) {
            rolesList.forEach(addRole);
        } else if (rolesList && typeof rolesList === 'object') {
            Object.values(rolesList).forEach((val) => {
                if (Array.isArray(val)) {
                    val.forEach(addRole);
                } else {
                    addRole(val);
                }
            });
        }

        (employees || []).forEach((emp) => addRole(emp?.role_designation));

        return Array.from(roleSet)
            .sort((a, b) => a.localeCompare(b))
            .map(r => ({ id: r, name: r }));
    }, [rolesList, employees]);

    const VISIBLE_WEEKS = 4;
    const projectWeeks = useMemo(
        () => getProjectWeeks(formData.startDate, formData.endDate),
        [formData.startDate, formData.endDate]
    );
    const visibleWeeks = useMemo(() => {
        if (projectWeeks.length > 0) {
            return showAllWeeks ? projectWeeks : projectWeeks.slice(0, VISIBLE_WEEKS);
        }
        // Placeholder weeks if no dates are set yet
        return Array.from({ length: VISIBLE_WEEKS }).map((_, i) => ({
            weekNum: `tmp-${i}`,
            year: new Date().getFullYear(),
            label: i === 0 ? 'This Week' : `Week ${i + 1}`,
            dateRange: 'Dates not set'
        }));
    }, [projectWeeks, showAllWeeks]);
    const hasMoreWeeks = projectWeeks.length > VISIBLE_WEEKS;

    const ensureTeamDropdownData = async () => {
        if (isDirectoryLoading) return;
        if (employeeOptions.length > 0 && roleOptions.length > 0) return;
        await loadEntities();
    };

    const handleTeamBlur = () => {
        window.setTimeout(() => {
            const activeElement = document.activeElement;
            if (teamTableRef.current && activeElement && teamTableRef.current.contains(activeElement)) {
                setIsTeamInputsActive(true);
            } else {
                setIsTeamInputsActive(false);
            }
        }, 0);
    };

    useEffect(() => {
        console.log('[AddProjectPanel] employee options length:', employeeOptions.length);
    }, [employeeOptions]);

    useEffect(() => {
        console.log('[AddProjectPanel] role options length:', roleOptions.length);
    }, [roleOptions]);

    const isDropdownOpen = Boolean(activeDropdown);
    const hideTeamHorizontalScroll = isDropdownOpen || isTeamInputsActive;

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
            const detail = error?.response?.data?.detail;
            let msg = `Failed to ${modal.mode} ${isClient ? 'client' : 'partner'}.`;
            if (typeof detail === 'string') {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
            } else if (detail && typeof detail === 'object') {
                msg = detail.msg || JSON.stringify(detail);
            }
            setModal(prev => ({ ...prev, error: msg }));
        }
    };

    const handleAddTeamMember = () => {
        setFormData(prev => ({
            ...prev,
            teamMembers: [
                ...prev.teamMembers,
                {
                    employee_id: '',
                    name: '',
                    role: '',
                    location: 'Remote',
                    allocation_pct: '',
                    allocation_start_date: '',
                    allocation_end_date: '',
                    billable_shadow: 'Billable',
                    weekly_hours: {},
                }
            ]
        }));
    };

    const handleEmployeeSelect = (index, emp) => {
        // Prevent duplicates
        const isDuplicate = formData.teamMembers.some((m, i) => i !== index && m.employee_id === emp.employee_id);
        if (isDuplicate) {
            alert(`${emp.employee_name} is already added to this project.`);
            return;
        }

        const newTeam = [...formData.teamMembers];
        newTeam[index] = {
            ...newTeam[index],
            employee_id: emp.employee_id,
            name: emp.employee_name,
            role: newTeam[index].role || emp.role_designation || '',
            location: newTeam[index].location !== 'Remote' ? newTeam[index].location : (emp.location || emp.mode_of_work || 'Remote'),
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

    /* Auto-fill weekly hours based on allocation_pct and date range */
    const autoFillWeeks = (index, updatedMember) => {
        const projectWeeks = getProjectWeeks(formData.startDate, formData.endDate);
        const pct = Math.min(100, Math.max(0, parseInt(updatedMember.allocation_pct) || 0));
        const hours = Math.round((pct / 100) * 40);

        let targetWeeks = projectWeeks;
        if (updatedMember.allocation_start_date || updatedMember.allocation_end_date) {
            targetWeeks = getProjectWeeks(
                updatedMember.allocation_start_date || formData.startDate,
                updatedMember.allocation_end_date || formData.endDate
            );
        }

        const newWeeklyHours = {};
        targetWeeks.forEach(w => { newWeeklyHours[w.weekNum] = hours; });

        const newTeam = [...formData.teamMembers];
        newTeam[index] = { ...updatedMember, weekly_hours: newWeeklyHours };
        setFormData(prev => ({ ...prev, teamMembers: newTeam }));
    };

    const handleTeamMemberChange = (index, field, value) => {
        const newTeam = [...formData.teamMembers];
        let updated = { ...newTeam[index], [field]: value };

        if (field === 'allocation_pct') {
            const pct = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0));
            updated.allocation_pct = pct;
            
            // Dynamic Proportional Allocation (100% = 40h)
            if (pct !== '') {
                const hours = Math.round((pct / 100) * 40);
                const projectWeeks = getProjectWeeks(formData.startDate, formData.endDate);
                
                let targetWeeks = projectWeeks;
                if (updated.allocation_start_date || updated.allocation_end_date) {
                    targetWeeks = getProjectWeeks(
                        updated.allocation_start_date || formData.startDate,
                        updated.allocation_end_date || formData.endDate
                    );
                }

                const newWeeklyHours = { ...(updated.weekly_hours || {}) };
                targetWeeks.forEach(w => {
                    newWeeklyHours[w.weekNum] = hours;
                });
                updated.weekly_hours = newWeeklyHours;
            }
        }

        newTeam[index] = updated;
        setFormData(prev => ({ ...prev, teamMembers: newTeam }));

        // Auto-fill weeks when dates change (keep logic for date shifts)
        if (['allocation_start_date', 'allocation_end_date'].includes(field)) {
            setTimeout(() => autoFillWeeks(index, updated), 0);
        }
    };

    const handleWeekHoursChange = (index, weekNum, value) => {
        const newTeam = [...formData.teamMembers];
        const hours = Math.min(40, Math.max(0, parseInt(value) || 0));
        newTeam[index] = {
            ...newTeam[index],
            weekly_hours: { ...newTeam[index].weekly_hours, [weekNum]: hours }
        };
        setFormData(prev => ({ ...prev, teamMembers: newTeam }));
    };

    // --- Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!(formData.name || '').trim()) {
            setSubmitError('Project name is required.');
            return;
        }
        if (!formData.startDate) {
            setSubmitError('Start date is required.');
            return;
        }
        const normalizedStart = normalizeDateString(formData.startDate);
        if (!normalizedStart) {
            setSubmitError('Start date format is invalid.');
            return;
        }
        const normalizedEnd = normalizeDateString(formData.endDate);
        if (normalizedEnd && normalizedStart) {
            const startTs = new Date(normalizedStart).getTime();
            const endTs = new Date(normalizedEnd).getTime();
            if (endTs < startTs) {
                setSubmitError('End date cannot be earlier than start date.');
                return;
            }
        }
        if (formData.type === 'Client' && !formData.clientType) {
            setSubmitError('Please select a client type.');
            return;
        }
        if (formData.type === 'Client' && formData.clientType === DIRECT_CLIENT_TYPE && !formData.clientId) {
            setSubmitError('Please select a client.');
            return;
        }
        if (formData.type === 'Client' && formData.clientType === PARTNER_CLIENT_TYPE && !formData.partnerId) {
            setSubmitError('Please select a partner.');
            return;
        }
        if (formData.type === 'Client' && formData.clientType === PARTNER_CLIENT_TYPE && !formData.clientId) {
            setSubmitError('Please select a client.');
            return;
        }
        if (formData.status === 'In Progress' && !formData.sowStatus) {
            setSubmitError('SOW Status is required when Project Status is In Progress.');
            return;
        }

        const projectId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
        const isClientProject = formData.type === 'Client';
        const isPartnerClientProject = formData.type === 'Client' && formData.clientType === PARTNER_CLIENT_TYPE;
        const effectiveType = formData.type;
        const normalizedClientId = isClientProject ? toIdOrNull(formData.clientId) : null;
        const normalizedPartnerId = isPartnerClientProject ? toIdOrNull(formData.partnerId) : null;

        if (isClientProject && !normalizedClientId) {
            setSubmitError('Selected client is invalid. Please re-select the client.');
            return;
        }
        if (isPartnerClientProject && !normalizedPartnerId) {
            setSubmitError('Selected partner is invalid. Please re-select the partner.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            project_id: projectId,
            project_name: (formData.name || '').trim(),
            project_status: formData.status,
            sub_status: formData.status === 'In Progress' ? formData.sowStatus : null,
            type: effectiveType,
            billable: formData.billable,
            start_date: normalizedStart,
            end_date: normalizedEnd || null,
            team_members: (formData.teamMembers || []).map(normalizeTeamMember)
        };

        if (isClientProject) {
            payload.client_id = normalizedClientId;
        }
        if (isPartnerClientProject) {
            payload.partner_id = normalizedPartnerId;
        }

        console.log('Payload:', payload, 'client_id:', payload.client_id);

        try {
            const response = await axios.post('/projects', payload);
            if (!response || response.data?.error) {
                throw new Error(response?.data?.message || 'Save failed');
            }
            setSubmitError('');
            setIsSubmitting(false);
            if (onAdd) onAdd(response?.data || payload);
            onClose();
        } catch (err) {
            console.error('Save Error:', err);
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                err?.message ||
                err ||
                'Failed to save changes';
            setSubmitError(toMessage(message, 'Failed to save changes'));
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isClientProject = formData.type === 'Client';
    const isDirectClient = isClientProject && formData.clientType === DIRECT_CLIENT_TYPE;
    const isPartnerClient = isClientProject && formData.clientType === PARTNER_CLIENT_TYPE;
    const entityLabel = modal.entityType === 'client' ? 'Client' : 'Partner';

    return (
        <>
            {!pageMode && (
                <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            )}

            {/* Panel / Page */}
            <div className={pageMode
                ? "w-full h-full bg-white flex flex-col"
                : "fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col"
            }>

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
                                <AlertCircle size={16} className="shrink-0" /> {toMessage(submitError)}
                            </div>
                        )}
                        {entityError && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" /> {toMessage(entityError)}
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
                                        <option value="Client">Client</option>
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
                                                disabled
                                            />
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Add Partner">
                                                <Plus size={12} /> Add
                                            </button>
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Edit Partner">
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Delete Partner">
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
                                                disabled
                                                noResultsText={isPartnerClient ? 'No clients available for the selected partner' : 'No results found'}
                                                loadOptions={fetchAutocompleteClients}
                                            />
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Add Client">
                                                <Plus size={12} /> Add
                                            </button>
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Edit Client">
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button type="button" disabled
                                                className="px-2.5 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1" title="Delete Client">
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

                                {formData.status === 'In Progress' && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase">SOW Status</label>
                                        <select
                                            name="sowStatus"
                                            className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer font-medium text-gray-700"
                                            value={formData.sowStatus}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select SOW Status</option>
                                            {PROJECT_SUB_STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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
                        <div className="flex flex-col gap-4 mb-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-emerald-500" />
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Team Members</h3>
                                </div>
                                <button type="button" onClick={handleAddTeamMember} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                                    <Plus size={14} /> Add Team Member
                                </button>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
                                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                <div className="text-[11px] text-blue-700 leading-relaxed">
                                    <strong>Allocation Logic:</strong> 40h/week = 100% allocation. Set allocation % and optionally a date range, then click <strong>Full</strong> or leave date range to auto-fill all project weeks. Weeks are derived from the project start/end dates. <strong>Billable</strong> = client-facing; <strong>Shadow</strong> = non-billable, works behind the scenes.
                                </div>
                            </div>

                            {formData.teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    No team members allocated to this project yet.
                                </div>
                            ) : (
                                    <div
                                        ref={teamTableRef}
                                        onFocusCapture={() => setIsTeamInputsActive(true)}
                                        onBlurCapture={handleTeamBlur}
                                        className="rounded-xl border border-gray-100 shadow-sm overflow-x-auto overflow-y-visible"
                                    >
                                        <table className="w-full text-sm min-w-[1200px]">
                                            <thead>
                                                <tr className="bg-blue-50/70 border-b border-slate-200">
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide w-8">S.No</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[160px]">Name</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[140px]">Role</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[90px]">Location</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-blue-800 uppercase tracking-wide min-w-[110px] bg-blue-50/80">Allocation %</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[130px]">Start Date</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[130px]">End Date</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-700 uppercase tracking-wide min-w-[110px]">Resource Type</th>
                                                    {visibleWeeks.map((wk, wIdx) => {
                                                        const weekLabel = wIdx === 0 ? 'This Week' : `Week ${wIdx + 1}`;
                                                        return (
                                                        <th key={`${wk.year}-${wk.weekNum}`} className="px-2 py-3 text-center min-w-[64px] bg-blue-50 border-l border-slate-200">
                                                            <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-tight">{weekLabel}</div>
                                                            <div className="text-[9px] font-medium text-slate-500 whitespace-nowrap">{wk.dateRange}</div>
                                                        </th>
                                                        );
                                                    })}
                                                    {hasMoreWeeks && (
                                                        <th className="px-2 py-3 text-center min-w-[80px]">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowAllWeeks(v => !v)}
                                                                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                                                            >
                                                                {showAllWeeks ? '← Less' : `+${projectWeeks.length - VISIBLE_WEEKS} more`}
                                                            </button>
                                                        </th>
                                                    )}
                                                    <th className="px-3 py-3 text-center text-[10px] font-extrabold text-blue-600 uppercase tracking-wider w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.teamMembers.map((member, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 bg-white hover:bg-gray-100 transition-colors">
                                                        <td className="px-3 py-2 text-center text-slate-400 font-semibold">{idx + 1}</td>
                                                        <td className="px-2 py-2 min-w-[160px]">
                                                            <SearchableDropdown
                                                                items={employeeOptions}
                                                                selectedId={member.employee_id}
                                                                onSelect={(item) => handleEmployeeSelect(idx, item._raw)}
                                                                placeholder="Select Employee"
                                                                label="employees"
                                                                isLoading={isDirectoryLoading}
                                                                onBeforeOpen={ensureTeamDropdownData}
                                                                onOpenChange={(open) => setActiveDropdown(open ? `employee-${idx}` : '')}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 min-w-[140px]">
                                                            <SearchableDropdown
                                                                items={roleOptions}
                                                                selectedId={member.role}
                                                                onSelect={(item) => handleRoleSelect(idx, item.name)}
                                                                placeholder="Select Role"
                                                                label="roles"
                                                                isLoading={isDirectoryLoading}
                                                                onBeforeOpen={ensureTeamDropdownData}
                                                                onOpenChange={(open) => setActiveDropdown(open ? `role-${idx}` : '')}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 min-w-[90px]">
                                                            <select
                                                                value={member.location}
                                                                onChange={(e) => handleTeamMemberChange(idx, 'location', e.target.value)}
                                                                className="w-full h-10 px-2 text-xs border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white cursor-pointer"
                                                            >
                                                                <option value="Remote">Remote</option>
                                                                <option value="On-Site">On-Site</option>
                                                                <option value="Hybrid">Hybrid</option>
                                                            </select>
                                                        </td>
                                                        {/* Allocation % */}
                                                        <td className="px-2 py-2 min-w-[110px] bg-blue-50/50">
                                                            <input
                                                                type="number" min="0" max="100"
                                                                placeholder="0"
                                                                value={member.allocation_pct}
                                                                onChange={(e) => handleTeamMemberChange(idx, 'allocation_pct', e.target.value)}
                                                                className="w-16 h-10 px-2 text-xs text-center border rounded-md border-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </td>
                                                        {/* Start Date */}
                                                        <td className="px-2 py-2 min-w-[130px]">
                                                            <input
                                                                type="date"
                                                                value={member.allocation_start_date || ''}
                                                                onChange={(e) => handleTeamMemberChange(idx, 'allocation_start_date', e.target.value)}
                                                                className="w-[120px] h-10 px-2 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                                            />
                                                        </td>
                                                        {/* End Date */}
                                                        <td className="px-2 py-2 min-w-[130px]">
                                                            <input
                                                                type="date"
                                                                value={member.allocation_end_date || ''}
                                                                onChange={(e) => handleTeamMemberChange(idx, 'allocation_end_date', e.target.value)}
                                                                className="w-[120px] h-10 px-2 text-xs border rounded border-gray-200 outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                                            />
                                                        </td>
                                                        {/* Resource Type column */}
                                                        <td className="px-2 py-2 min-w-[110px]">
                                                            <select
                                                                value={member.billable_shadow}
                                                                onChange={(e) => handleTeamMemberChange(idx, 'billable_shadow', e.target.value)}
                                                                className={`w-full h-10 px-2 text-xs border rounded-md outline-none focus:ring-1 bg-white cursor-pointer font-semibold
                                                                    ${member.billable_shadow === 'Billable'
                                                                        ? 'border-emerald-200 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-100'
                                                                        : member.billable_shadow === 'Non-billable'
                                                                        ? 'border-amber-200 text-amber-700 focus:border-amber-400 focus:ring-amber-100'
                                                                        : 'border-slate-200 text-slate-500 focus:border-slate-400 focus:ring-slate-100'
                                                                    }`}
                                                            >
                                                                <option value="Billable">Billable</option>
                                                                <option value="Non-billable">Non-billable</option>
                                                                <option value="Shadow">Shadow</option>
                                                            </select>
                                                        </td>
                                                        {/* Dynamic week columns — Excel-style */}
                                                        {visibleWeeks.map((wk, wIdx) => {
                                                            const weekLabel = wIdx === 0 ? 'This Week' : `Week ${wIdx + 1}`;
                                                            return (
                                                            <td key={`${wk.year}-${wk.weekNum}`} className="px-1 py-2 min-w-[64px] border-l border-slate-100 bg-blue-50/40">
                                                                <input
                                                                    type="number" min="0" max="40"
                                                                    placeholder="0h"
                                                                    value={(member.weekly_hours || {})[wk.weekNum] ?? ''}
                                                                    onChange={(e) => handleWeekHoursChange(idx, wk.weekNum, e.target.value)}
                                                                    title={weekLabel}
                                                                    className="w-full px-1.5 py-1.5 text-xs text-center border border-blue-100 rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white font-semibold placeholder-slate-300"
                                                                />
                                                            </td>
                                                            );
                                                        })}
                                                        {/* Empty cell under "See more" header */}
                                                        {hasMoreWeeks && <td />}
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
