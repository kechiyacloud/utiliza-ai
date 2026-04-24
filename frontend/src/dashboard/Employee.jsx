import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Award, X, Building2, ChevronDown, Upload, Download, FileSpreadsheet, MoreHorizontal, ArrowLeft, UserSearch } from 'lucide-react'
import BulkImportModal from './employee/BulkImportModal'
import EmployeeTable from './employee/EmployeeTable'
import NewJoinerCard from './employee/NewJoinerCard'
import FilterOverlay from './employee/FilterOverlay'
import SkillsOverview from './employee/insights/SkillsOverview'
import { getEmployeeList } from '../api/employeeApi'
import { normalizeSkillName } from '../utils/skillTopics'
import MultiSelectDropdown from '../components/MultiSelectDropdown'
import { exportToCSV } from '../utils/exportUtils'
import { useDataRefresh } from '../context'
import ModuleLoader from '../components/ModuleLoader'

const StatCard = ({ label, value, icon: Icon, colorClass, loading, error, onClick, isActive }) => (
  <div
    className={`bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between transition-all hover:shadow-md cursor-pointer ${isActive ? 'border-blue-400 ring-2 ring-blue-100 ring-offset-1' : 'border-gray-100'}`}
    onClick={onClick}
  >
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <h3 className={`font-extrabold text-gray-800 ${value === 'Tap to View' ? 'text-sm mt-1' : 'text-xl'}`}>
        {loading ? (
          <span className="text-gray-400">...</span>
        ) : error ? (
          <span className="text-red-500">—</span>
        ) : (
          <span>{value ?? '—'}</span>
        )}
      </h3>
    </div>
    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon size={20} className={colorClass.replace('bg-', 'text-').replace('10', '500')} />
    </div>
  </div>
)

function Employee() {
  const navigate = useNavigate()
  const { refreshKey } = useDataRefresh()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allEmployees, setAllEmployees] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    departments: [],
    types: [],
    skills: [],
    locations: [],
    statusTags: [],
    designations: []
  });
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const [cardFilter, setCardFilter] = useState(location.state?.cardFilter || null);
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
        const data = await getEmployeeList(refreshKey > 0)
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
  }, [refreshKey])

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
  const benchEmployeesCount = baseGroup.filter(e => (e.employee_allocations || 0) <= 0).length;
  const noticeEmployeesCount = baseGroup.filter(e => {
    const s = (e.employee_status || '').toLowerCase();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{contextLabel} Management</h1>
          <p className="text-gray-500">See how your {contextLabel.toLowerCase()} is doing and manage people records.</p>
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
                const s = (e.employee_status || '').toLowerCase();
                const isLeaving = s.includes('notice') || e.date_of_resign;
                return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
              }).length > 0 ? `(${baseGroup.filter(e => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const joinDate = e.date_of_joining ? new Date(e.date_of_joining) : null;
                const s = (e.employee_status || '').toLowerCase();
                const isLeaving = s.includes('notice') || e.date_of_resign;
                return joinDate && joinDate >= thirtyDaysAgo && !isLeaving;
              }).length})` : ''}
            </span>
          </button>

        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label={`Total ${contextLabel === 'Team' ? 'Team' : 'Talent'}`}
          value={totalEmployeesCount}
          icon={Users}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)}
        />
        <StatCard
          label="Available Now"
          value={benchEmployeesCount}
          icon={BriefcaseBusiness}
          colorClass="bg-orange-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'bench'}
          onClick={() => setCardFilter('bench')}
        />
        <StatCard
          label="Notice Period & PIP"
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
            navigate(`/info/employee/${emp.employee_id || '123'}`, {
              state: {
                employee: emp,
                from: {
                  pathname: location.pathname,
                  search: location.search,
                  hash: location.hash,
                  state: location.state || null
                }
              }
            })
          }
          onEmployeeEdit={(emp) => navigate('/info/employee/add', { state: { editData: emp, editEmployeeId: emp.employee_id, isEditMode: true } })}
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
