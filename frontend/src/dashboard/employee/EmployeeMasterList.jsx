import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Award, UserMinus, X, Building2, ChevronDown, Upload, Download, FileSpreadsheet, MoreHorizontal, ArrowLeft, Archive } from 'lucide-react'
import BulkImportModal from './BulkImportModal'
import EmployeeTable from './EmployeeTable'
import NewJoinerCard from './NewJoinerCard'
import FilterOverlay from './FilterOverlay'
import SkillsOverview from './insights/SkillsOverview'
import { getEmployeeList } from '../../api/employeeApi'
import { useEmployees } from '../../context/EmployeeContext'
import { normalizeSkillName } from '../../utils/skillTopics'
import MultiSelectDropdown from '../../components/MultiSelectDropdown'

const StatCard = ({ label, value, icon: Icon, colorClass, loading, error, onClick, isActive }) => (
  <div
    className={`bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between transition-all hover:shadow-md cursor-pointer ${isActive ? 'border-blue-400 ring-2 ring-blue-100 ring-offset-1' : 'border-gray-100'}`}
    onClick={onClick}
  >
    <div className="flex-1">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center justify-between">
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
    </div>
    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon size={20} className={colorClass.replace('bg-', 'text-').replace('10', '500')} />
    </div>
  </div>
)

function EmployeeMasterList() {
  const navigate = useNavigate()
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
  const { showArchived, showDeleted } = useEmployees();
  const [showArchivedLocal, setShowArchivedLocal] = useState(false); // We still need this for internal table filtering if we don't want to re-fetch? 
  // Wait, let's use the context ones for the fetch.

  // Department chip selector
  const [selectedDepts, setSelectedDepts] = useState(() => {
    const initialDepartment = location.state?.departmentFilter;
    if (initialDepartment && initialDepartment !== 'Overall') {
      return initialDepartment.includes(',') ? initialDepartment.split(',') : [initialDepartment];
    }
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
  }, [selectedDepts]);

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
        const data = await getEmployeeList(false, showArchived, showDeleted)
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
  }, [showArchived])

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

  const contextLabel = combinedFilters.departments?.length > 0 ? 'Team' : 'Organization';

  const totalEmployeesCount = baseGroup.length;
  const benchEmployeesCount = baseGroup.filter(e => (e.employee_allocations || 0) <= 0).length;
  const noticeEmployeesCount = baseGroup.filter(e => (e.employee_status || '').toLowerCase().includes('notice')).length;

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
            <h1 className="text-2xl font-bold text-gray-800">Organization Management</h1>
            <p className="text-gray-500 font-medium tracking-tight">See how your organization is doing and manage people records.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add Employee Button */}
          <button
            onClick={() => navigate('/info/employee/add')}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
            title="Add Single Employee"
          >
            <UserPlus size={18} />
          </button>

          {/* Department Selector */}
          <MultiSelectDropdown
            options={allDepts}
            selectedValues={selectedDepts}
            onChange={setSelectedDepts}
            placeholder="Select Departments"
            icon={Building2}
          />
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="TOTAL EMPLOYEES"
          value={totalEmployeesCount}
          icon={Users}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)}
        />
        <StatCard
          label="TOTAL BENCH"
          value={benchEmployeesCount}
          icon={UserMinus}
          colorClass="bg-orange-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'bench'}
          onClick={() => setCardFilter('bench')}
        />
        <StatCard
          label="NOTICE PERIOD"
          value={noticeEmployeesCount}
          icon={Hourglass}
          colorClass="bg-red-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'notice'}
          onClick={() => setCardFilter('notice')}
        />
        <NewJoinerCard employees={baseGroup} isActive={cardFilter === 'new-joiner'} onClick={() => setCardFilter('new-joiner')} />
        <StatCard
          label="SKILL SUMMARY"
          value="Tap to View"
          icon={Award}
          colorClass="bg-purple-500"
          loading={loading}
          error={error}
          onClick={() => setActiveDrawer('skills')}
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
             onClick={() => getEmployeeList(false, showArchived, showArchived).then(setAllEmployees).catch(err => setError(err.message))} 
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
          employees={allEmployees}
          loading={loading}
          onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id || '123'}`, { state: { employee: emp } })}
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
            getEmployeeList(true, showArchived, showArchived).then(setAllEmployees);
          }}
          filters={combinedFilters}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
        />
      </div>
      )}

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

export default EmployeeMasterList
