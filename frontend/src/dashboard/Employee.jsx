import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Award, UserMinus, X, Building2, ChevronDown, Upload, MoreHorizontal, ArrowLeft, UserSearch, UserCheck, Activity } from 'lucide-react'
import BulkImportModal from './employee/BulkImportModal'
import EmployeeTable from './employee/EmployeeTable'
import NewJoinerCard from './employee/NewJoinerCard'
import FilterOverlay from './employee/FilterOverlay'
import SkillsOverview from './employee/insights/SkillsOverview'
import { getEmployeeList } from '../api/employeeApi'
import { normalizeSkillName } from '../utils/skillTopics'
import { useEmployees } from '../context/EmployeeContext'
import { getEmployeeStatus } from '../utils/employeeStatus'
import MultiSelectDropdown from '../components/MultiSelectDropdown'
import { useDataRefresh } from '../context'
import ModuleLoader from '../components/ModuleLoader'
import { encodeId } from '../utils/idEncoder'

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

function Employee() {
  const navigate = useNavigate()
  const { refreshKey } = useDataRefresh()
  const { showArchived, showDeleted } = useEmployees()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allEmployees, setAllEmployees] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const location = useLocation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [cardFilter, setCardFilter] = useState(location.state?.cardFilter || null);
  const [filters, setFilters] = useState(location.state?.filters || {
    departments: [],
    types: [],
    skills: [],
    locations: [],
    statusTags: [],
    designations: []
  });
  const [searchQuery, setSearchQuery] = useState(location.state?.search || "");
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Department chip selector — default shows all unique depts; user can narrow down
  const [selectedDepts, setSelectedDepts] = useState(() => {
    const initialDepartment = location.state?.departmentFilter;
    if (initialDepartment && initialDepartment !== 'Overall') {
      return initialDepartment.includes(',') ? initialDepartment.split(',') : [initialDepartment];
    }
    try {
      const saved = localStorage.getItem('employee_department_filter');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('employee_department_filter', JSON.stringify(selectedDepts));
  }, [selectedDepts]);
  const allDepts = useMemo(() =>
    [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort()
    , [allEmployees]);

  const employeeHasMatchingSkill = (employeeSkills = [], selectedSkills = []) => {
    if (!selectedSkills.length) return true;

    const normalizedEmployeeSkills = new Set(
      (employeeSkills || []).map((skill) => normalizeSkillName(skill).toLowerCase()).filter(Boolean)
    );

    return selectedSkills.some((skill) => normalizedEmployeeSkills.has(normalizeSkillName(skill).toLowerCase()));
  };

  const toggleDept = (dept) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  useEffect(() => {
    let mounted = true

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getEmployeeList(true, showArchived, showDeleted)
        if (!mounted) return

        setAllEmployees(data)

        // Guard: if saved department filter produces zero results, clear it to avoid deadlock
        setSelectedDepts(prev => {
          if (prev.length === 0) return prev;
          const hasMatch = data.some(e => prev.includes(e.department));
          if (!hasMatch) {
            localStorage.removeItem('employee_department_filter');
            return [];
          }
          return prev;
        });

      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAllData()
    return () => { mounted = false }
  }, [refreshKey, showArchived, showDeleted])

  // Combined filters passed to EmployeeTable — dept chips override the filter drawer's dept selection
  const combinedFilters = useMemo(() => ({
    ...filters,
    departments: selectedDepts.length > 0 ? selectedDepts : filters.departments,
    search: searchQuery,
    cardFilter: cardFilter
  }), [filters, selectedDepts, searchQuery, cardFilter]);

  const baseGroup = useMemo(() => {
    return allEmployees.filter(emp => {
      // Apply filters but NOT the cardFilter so the cards themselves reflect the global pool correctly
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
        (emp.skills && emp.skills.some(skill => skill.toLowerCase().includes(sv)))
      );

      return matchesDept && matchesType && matchesLocation && matchesSkills && matchesDesig && matchesSearch;
    });
  }, [allEmployees, combinedFilters]);

  // Dynamic context Label
  const contextLabel = combinedFilters.departments?.length > 0 ? 'Team' : 'Organization';

  // Derived stats from the filtered group
  const totalEmployeesCount = baseGroup.length;
  const billableCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s === 'allocated' && (e.billable || '').toLowerCase() === 'billable';
  }).length;

  const nonBillableCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s === 'allocated' && (e.billable || '').toLowerCase().includes('non');
  }).length;

  const benchEmployeesCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s === 'bench';
  }).length;

  const noticeEmployeesCount = baseGroup.filter(e => {
    const s = getEmployeeStatus(e).toLowerCase();
    return s.includes('notice') || s.includes('pip');
  }).length;

  if (loading && !allEmployees.length) {
    return <ModuleLoader label="Loading Employees" />;
  }

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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{contextLabel} Management</h1>
            <p className="text-sm font-medium text-gray-500">See how your {contextLabel.toLowerCase()} is doing and manage employee records.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Employee Button */}
          <button
            onClick={() => navigate('/info/employee/add')}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
            title="Add Single Employee"
          >
            <UserPlus size={18} />
          </button>

          {/* New Joiners Button */}
          <button
            onClick={() => setCardFilter('new-joiner')}
            className={`flex items-center gap-2.5 px-4 py-2.5 bg-white border rounded-xl transition-all shadow-sm ${cardFilter === 'new-joiner' ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-300'}`}
            title="View New Joiners"
          >
            <UserSearch size={18} strokeWidth={2.5} />
            <span className="text-sm font-bold whitespace-nowrap">
            New Joiners {baseGroup.filter(e => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const joinDate = e.date_of_joining ? new Date(e.date_of_joining) : null;
                const s = getEmployeeStatus(e).toLowerCase();
                const isLeaving = s.includes('notice') || s.includes('resign') || e.date_of_resign;
                return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
              }).length > 0 ? `(${baseGroup.filter(e => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const joinDate = e.date_of_joining ? new Date(e.date_of_joining) : null;
                const s = getEmployeeStatus(e).toLowerCase();
                const isLeaving = s.includes('notice') || s.includes('resign') || e.date_of_resign;
                return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
              }).length})` : ''}
            </span>
          </button>

        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Talent"
          value={totalEmployeesCount}
          icon={Users}
          colorClass="bg-slate-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)}
        />
        <StatCard
          label="Billable"
          value={billableCount}
          icon={UserCheck}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'billable'}
          onClick={() => setCardFilter('billable')}
        />
        <StatCard
          label="Non-Billable"
          value={nonBillableCount}
          icon={Activity}
          colorClass="bg-emerald-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'non-billable'}
          onClick={() => setCardFilter('non-billable')}
        />
        <StatCard
          label="Total Bench"
          value={benchEmployeesCount}
          icon={UserMinus}
          colorClass="bg-rose-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'bench'}
          onClick={() => setCardFilter('bench')}
        />
        <StatCard
          label="Notice Period"
          value={noticeEmployeesCount}
          icon={Hourglass}
          colorClass="bg-red-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'notice'}
          onClick={() => setCardFilter('notice')}
        />
        <StatCard
          label="Skill Summary"
          value="Tap to View"
          icon={Award}
          colorClass="bg-purple-500"
          loading={loading}
          error={error}
          onClick={() => setActiveDrawer('skills')}
        />
      </div>

      {/* Employee Table */}
      <div className='flex-1 w-full mt-4'>
        <EmployeeTable
          contextLabel={contextLabel}
          employees={allEmployees}
          loading={loading}
          onEmployeeClick={(emp) =>
            navigate(`/info/employee/${encodeId(emp.employee_id || '123')}`, {
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
          onEmployeeEdit={(emp) => navigate('/info/employee/add', { replace: true, state: { editData: emp, editEmployeeId: emp.employee_id, isEditMode: true } })}
          onEmployeeDelete={(deletedId) => {
            setAllEmployees(prev => prev.filter(emp => emp.employee_id !== deletedId));
          }}
          filters={combinedFilters}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
        />
      </div>

      {/* Sliding Drawer for Insights */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${activeDrawer ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
          </h2>
          <button
            onClick={() => setActiveDrawer(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeDrawer === 'skills' && <SkillsOverview employees={baseGroup} />}
        </div>
      </div>

      {/* Backdrop */}
      {activeDrawer && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setActiveDrawer(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportModal onClose={() => setShowBulkModal(false)} />
      )}
    </div>
  )
}

export default Employee
