import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Award, UserMinus, X, Building2, ChevronDown, Upload, Download, FileSpreadsheet, MoreHorizontal, ArrowLeft, Archive, UserCheck, Activity, UserRoundPlus, UserSearch, AlertCircle } from 'lucide-react'
import BulkImportModal from './BulkImportModal'
import EmployeeTable from './EmployeeTable'
import NewJoinerCard from './NewJoinerCard'
import FilterOverlay from './FilterOverlay'
import SkillsOverview from './insights/SkillsOverview'
import { getEmployeeList } from '../../api/employeeApi'
import { useEmployees } from '../../context/EmployeeContext'
import { useDataRefresh } from '../../context'
import { normalizeSkillName } from '../../utils/skillTopics'
import MultiSelectDropdown from '../../components/MultiSelectDropdown'
import { encodeId } from '../../utils/idEncoder'
import { getEmployeeStatus } from '../../utils/employeeStatus'

const StatCard = ({ label, value, icon: Icon, colorClass, loading, error, onClick, isActive }) => (
  <div
    className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between min-h-[100px] shadow-sm relative group ${
      onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30' : 'cursor-default'
    } ${isActive ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-100' : 'bg-white border-slate-200'}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between w-full mb-3">
      <p className={`text-2xl font-bold transition-colors ${isActive ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-700'}`}>
        {loading ? (
          <span className="text-slate-200 animate-pulse">...</span>
        ) : error ? (
          <span className="text-rose-500">—</span>
        ) : (
          value ?? '—'
        )}
      </p>
      <div className={`p-2 rounded-xl transition-all ${isActive ? `${colorClass} bg-opacity-20 text-blue-700` : `bg-slate-50 ${colorClass.replace('bg-', 'text-').replace('500', '600')} group-hover:bg-blue-100 group-hover:text-blue-700`}`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
    </div>
    <div className="flex flex-col">
      <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-blue-600/80' : 'text-slate-500 group-hover:text-blue-600/80'}`}>
        {label}
      </p>
    </div>
  </div>
)

function EmployeeMasterList() {
  const navigate = useNavigate()
  const { refreshKey } = useDataRefresh()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allEmployees, setAllEmployees] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const location = useLocation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [cardFilter, setCardFilter] = useState(location.state?.cardFilter || searchParams.get('filter') || null);
  const [filters, setFilters] = useState(location.state?.filters || {
    departments: [],
    types: [],
    skills: [],
    locations: [],
    statusTags: [],
    designations: []
  });
  const [searchQuery, setSearchQuery] = useState(location.state?.search || "");
  const { showArchived, showDeleted } = useEmployees();

  const handleCardClick = (filterType) => {
    setCardFilter(prev => prev === filterType ? null : filterType);
  };

  const [selectedDepts, setSelectedDepts] = useState(() => {
    const initialDepartment = location.state?.departmentFilter;
    if (initialDepartment && initialDepartment !== 'Overall') {
      if (Array.isArray(initialDepartment)) return initialDepartment;
      return initialDepartment.includes(',') ? initialDepartment.split(',') : [initialDepartment];
    }
    try {
      const dashSaved = localStorage.getItem('dashboard_filters_v1');
      if (dashSaved) {
        const parsed = JSON.parse(dashSaved);
        if (parsed && Array.isArray(parsed.departments)) {
          return parsed.departments;
        }
      }
    } catch (e) {}
    try {
      const saved = localStorage.getItem('employee_department_filter');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn('Failed to parse saved department filter:', err);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('employee_department_filter', JSON.stringify(selectedDepts));
    try {
      const saved = localStorage.getItem('dashboard_filters_v1');
      const parsed = saved ? JSON.parse(saved) : { departments: [] };
      parsed.departments = selectedDepts;
      localStorage.setItem('dashboard_filters_v1', JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to sync employee department filter to dashboard:', e);
    }
  }, [selectedDepts]);

  // Clear stale department filter if none of the saved departments exist in the loaded data
  useEffect(() => {
    if (allEmployees.length > 0 && selectedDepts.length > 0) {
      const validDepts = new Set(allEmployees.map(e => e.department).filter(Boolean));
      const stillValid = selectedDepts.filter(d => validDepts.has(d));
      if (stillValid.length !== selectedDepts.length) {
        setSelectedDepts(stillValid);
      }
    }
  }, [allEmployees]);

  const allDepts = useMemo(() =>
    [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort()
    , [allEmployees]);

  const employeeHasMatchingSkill = (employeeSkills = [], selectedSkills = []) => {
    if (!selectedSkills.length) return true;

    const normalizedEmployeeSkills = new Set(
      (employeeSkills || []).map((skill) => {
        const normalized = normalizeSkillName(skill);
        return normalized ? normalized.toLowerCase() : null;
      }).filter(Boolean)
    );

    return selectedSkills.some((skill) => normalizedEmployeeSkills.has(normalizeSkillName(skill).toLowerCase()));
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)
      try {
        // When showing archived, we want both resigned and deleted
        const data = await getEmployeeList(refreshKey > 0 || true, showArchived, showDeleted) // forceUpdate if key > 0, but adding a timestamp helps too
        if (controller.signal.aborted) return;
        setAllEmployees(data)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err?.message || 'Failed to load')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchAllData()
    return () => controller.abort();
  }, [showArchived, showDeleted, refreshKey])

  const combinedFilters = useMemo(() => ({
    ...filters,
    departments: selectedDepts.length > 0 ? selectedDepts : filters.departments,
    search: searchQuery,
    cardFilter: cardFilter
  }), [filters, selectedDepts, searchQuery, cardFilter]);

  const baseGroup = useMemo(() => {
    return allEmployees.filter(emp => {
      const matchesDept = !combinedFilters.departments?.length || combinedFilters.departments.includes(emp.department);
      const matchesType = !combinedFilters.types?.length || combinedFilters.types.includes(emp.employee_type);
      const matchesLocation = !combinedFilters.locations?.length || combinedFilters.locations.includes(emp.location);
      const matchesSkills = employeeHasMatchingSkill(emp.skills, combinedFilters.skills);
      const matchesDesig = !combinedFilters.designations?.length || combinedFilters.designations.includes(emp.role_designation);

      const sv = combinedFilters.search?.toLowerCase().trim();
      const matchesSearch = !sv || (
        emp.employee_name?.toLowerCase().includes(sv) ||
        emp.employee_id?.toLowerCase().includes(sv) ||
        emp.role_designation?.toLowerCase().includes(sv) ||
        emp.location?.toLowerCase().includes(sv) ||
        emp.department?.toLowerCase().includes(sv) ||
        (emp.skills && emp.skills.some(skill => skill && typeof skill === 'string' && skill.toLowerCase().includes(sv)))
      );

      return matchesDept && matchesType && matchesLocation && matchesSkills && matchesDesig && matchesSearch;
    });
  }, [allEmployees, combinedFilters]);

  const finalEmployees = useMemo(() => {
    if (!cardFilter) return baseGroup;

    const thirtyDaysAgo = new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000));

    return baseGroup.filter(emp => {
      const s = getEmployeeStatus(emp).toLowerCase();
      const billable = (emp.billable || '').toLowerCase();

      switch (cardFilter) {
        case 'billable':
          return ['allocated', 'partially allocated', 'partially bench'].includes(s) && billable === 'billable';
        case 'internal':
          return (
            s === 'leadership' ||
            s === 'internal operations' ||
            s === 'system account'
          );
        case 'non-billable':
          return (
            ['allocated', 'partially allocated', 'partially bench'].includes(s) && billable.includes('non')
          );
        case 'bench':
          return s === 'bench';
        case 'overallocated':
          return (emp.employee_allocations || 0) > 100;
        case 'notice':
          return s.includes('notice') || s.includes('pip');
        case 'new-joiner': {
          const joinDate = emp.date_of_joining ? new Date(emp.date_of_joining) : null;
          const isLeaving = s.includes('notice') || s.includes('pip') || s.includes('resign') || emp.date_of_resign;
          return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
        }
        default:
          return true;
      }
    });
  }, [baseGroup, cardFilter]);

  const contextLabel = combinedFilters.departments?.length > 0 ? 'Team' : 'Organization';

  const totalEmployeesCount = baseGroup.length;

  const billableCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    const isAllocated = ['allocated', 'partially allocated', 'partially bench'].includes(s);
    return isAllocated && (e.billable || '').toLowerCase() === 'billable';
  }).length;

  const nonBillableCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    const b = (e.billable || '').toLowerCase();
    const isAllocated = ['allocated', 'partially allocated', 'partially bench'].includes(s);
    return (isAllocated && b.includes('non'));
  }).length;

  const internalCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return (
      s === 'leadership' ||
      s === 'internal operations' ||
      s === 'system account'
    );
  }).length;

  const benchEmployeesCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s === 'bench';
  }).length;

  const noticeEmployeesCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s.includes('notice') || s.includes('pip');
  }).length;


  const newJoinersCount = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    return baseGroup.filter(e => {
      const joinDate = e.date_of_joining ? new Date(e.date_of_joining) : null;
      const s = getEmployeeStatus(e).toLowerCase();
      const isLeaving = s.includes('notice') || s.includes('pip') || s.includes('resign') || e.date_of_resign;
      return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
    }).length;
  }, [baseGroup]);

  const deptCounts = useMemo(() => {
    return allEmployees.reduce((acc, emp) => {
      if (emp.department) {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allEmployees]);

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto relative">
      <FilterOverlay
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        employees={allEmployees}
      />

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Organization Management</h1>
            <p className="text-sm font-medium text-gray-500">See how your organization is doing and manage people records.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Employee Button */}
          <button
            onClick={() => navigate('/info/employee/add')}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
            title="Add Single Employee"
          >
            <UserRoundPlus size={18} />
          </button>

          {/* Skill Summary Button */}
          <button
            onClick={() => navigate('/info/skills', { state: { employees: baseGroup } })}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-100 text-gray-400 rounded-xl hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 transition-all shadow-sm"
            title="View Skill Summary"
          >
            <Award size={18} />
          </button>

          {/* New Joiners Button */}
          <button
            onClick={() => handleCardClick('new-joiner')}
            className={`flex items-center gap-2.5 px-4 py-2.5 bg-white border rounded-xl transition-all shadow-sm ${cardFilter === 'new-joiner' ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-300'}`}
            title="View New Joiners"
          >
            <UserSearch size={18} strokeWidth={2.5} />
            <span className="text-sm font-bold whitespace-nowrap">
              New Joiners {newJoinersCount > 0 ? `(${newJoinersCount})` : ''}
            </span>
          </button>

          {/* Department Selector */}
          <MultiSelectDropdown
            options={allDepts}
            selectedValues={selectedDepts}
            onChange={setSelectedDepts}
            placeholder="Select Departments"
            icon={Building2}
            counts={deptCounts}
          />
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="TOTAL EMPLOYEES"
          value={totalEmployeesCount}
          icon={Users}
          colorClass="bg-slate-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)}
        />
        <StatCard
          label="BILLABLE"
          value={billableCount}
          icon={UserCheck}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'billable'}
          onClick={() => handleCardClick('billable')}
        />
        <StatCard
          label="INTERNAL"
          value={internalCount}
          icon={Building2}
          colorClass="bg-indigo-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'internal'}
          onClick={() => handleCardClick('internal')}
        />
        <StatCard
          label="NON-BILLABLE"
          value={nonBillableCount}
          icon={Activity}
          colorClass="bg-emerald-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'non-billable'}
          onClick={() => handleCardClick('non-billable')}
        />
        <StatCard
          label="TOTAL BENCH"
          value={benchEmployeesCount}
          icon={UserMinus}
          colorClass="bg-rose-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'bench'}
          onClick={() => handleCardClick('bench')}
        />
        <StatCard
          label="NOTICE PERIOD"
          value={noticeEmployeesCount}
          icon={Hourglass}
          colorClass="bg-red-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'notice'}
          onClick={() => handleCardClick('notice')}
        />
      </div>

      {error && !allEmployees.length && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-red-100 shadow-sm gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">Backend Connection Error</h3>
            <p className="text-gray-500 max-w-sm text-sm">
              We couldn't reach the organization records. Please ensure the backend server and its matching containers are running.
            </p>
          </div>
          <div className="text-red-500 text-xs font-medium bg-red-50/50 px-4 py-2 rounded-lg border border-red-100/50 max-w-md truncate">
            {error}
          </div>
          <button
            onClick={async () => {
              try {
                const data = await getEmployeeList(false, showArchived, showDeleted);
                setAllEmployees(data);
                setError(null);
              } catch (err) {
                setError(err.message);
              }
            }}
            className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Employee Table */}
      {(!error || allEmployees.length > 0) && (
        <div className='flex-1 w-full mt-4'>
          <EmployeeTable
            contextLabel={contextLabel}
            employees={finalEmployees}
            loading={loading}
            onEmployeeClick={(emp) =>
              navigate(`/info/employee/${encodeId(emp.employee_id || emp.email_id || '123')}`, {
                state: {
                  employee: emp,
                  from: {
                    pathname: location.pathname,
                    search: location.search,
                    hash: location.hash,
                    state: { 
                      ...location.state, 
                      cardFilter, 
                      filters,
                      search: searchQuery
                    }
                  }
                }
              })
            }
            onEmployeeEdit={(emp) => navigate('/info/employee/add', { state: { editData: emp, editEmployeeId: emp.employee_id, isEditMode: true } })}
            onEmployeeDelete={(deletedId) => {
              // If we are in "Archived" mode, we don't necessarily want to remove it from UI immediately
              // because it just becomes a soft-deleted record which IS archived.
              // But for responsiveness, if we AREN'T showing archived, remove it.
              if (!showArchived) {
                setAllEmployees(prev => prev.filter(emp => emp.employee_id !== deletedId));
              } else {
                // Refresh data to show it as archived
                getEmployeeList(true, true, true).then(setAllEmployees);
              }
            }}
            showArchived={showArchived}
            onRestore={() => {
              // Re-fetch everything after a restore
              getEmployeeList(true, showArchived, showDeleted).then(setAllEmployees);
            }}
            filters={combinedFilters}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilterClick={() => setIsFilterOpen(true)}
          />
        </div>
      )}



      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportModal onClose={() => setShowBulkModal(false)} />
      )}
    </div>
  )
}

export default EmployeeMasterList
