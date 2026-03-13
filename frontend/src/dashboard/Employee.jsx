import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Award, TrendingUp, X, Building2 } from 'lucide-react'
import EmployeeTable from './employee/EmployeeTable'
import NewJoinerCard from './employee/NewJoinerCard'
import FilterOverlay from './employee/FilterOverlay'
import SkillsOverview from './employee/insights/SkillsOverview'
import UtilizationTrend from './employee/insights/UtilizationTrend'
import { getEmployeeList } from '../api/employeeApi'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allEmployees, setAllEmployees] = useState([]);

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
  const [selectedDepts, setSelectedDepts] = useState([]);
  const allDepts = useMemo(() =>
    [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort()
    , [allEmployees]);

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
        const data = await getEmployeeList()
        if (!mounted) return

        setAllEmployees(data)
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAllData()
    return () => { mounted = false }
  }, [])

  // Combined filters passed to EmployeeTable — dept chips override the filter drawer's dept selection
  const combinedFilters = {
    ...filters,
    departments: selectedDepts.length > 0 ? selectedDepts : filters.departments,
    search: searchQuery,
    cardFilter: cardFilter
  };

  const baseGroup = useMemo(() => {
    return allEmployees.filter(emp => {
      // Apply filters but NOT the cardFilter so the cards themselves reflect the global pool correctly
      const matchesDept = !combinedFilters.departments?.length || combinedFilters.departments.includes(emp.department);
      const matchesType = !combinedFilters.types?.length || combinedFilters.types.includes(emp.employee_type);
      const matchesLocation = !combinedFilters.locations?.length || combinedFilters.locations.includes(emp.location);
      const matchesSkills = !combinedFilters.skills?.length || (emp.skills && combinedFilters.skills.some(s => emp.skills.includes(s)));
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

  // Derived stats from the filtered group
  const totalEmployeesCount = baseGroup.length;
  const benchEmployeesCount = baseGroup.filter(e => (e.employee_status || '').toLowerCase() === 'bench').length;
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
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Management</h1>
          <p className="text-gray-500">Manage your workforce, track status, and view details.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Utilization Trend Icon Button */}
          <button
            onClick={() => setActiveDrawer('trend')}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-200 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-all shadow-sm"
            title="Utilization Trend"
          >
            <TrendingUp size={18} />
          </button>

          {/* Add Employee Button */}
          <button
            onClick={() => navigate('/info/employee/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus size={18} />
            Add
          </button>
        </div>
      </div>

      {/* Department Filter — table-row style */}
      {allDepts.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex-shrink-0">
          <div className="flex items-center border-b border-gray-100 px-4 py-2 bg-gray-50">
            <Building2 size={13} className="text-gray-400 mr-2" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex-1">Department</span>
            <span className="text-[11px] text-gray-400 font-medium">
              {selectedDepts.length > 0 ? `${selectedDepts.length} selected` : 'All'}
            </span>
          </div>
          <div className="flex overflow-x-auto custom-scrollbar divide-x divide-gray-100">
            {/* All button */}
            <button
              onClick={() => setSelectedDepts([])}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-2.5 min-w-[80px] transition-all border-b-2 text-center ${selectedDepts.length === 0
                  ? 'border-blue-500 bg-blue-50/60 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              <span className={`text-xs font-bold ${selectedDepts.length === 0 ? 'text-blue-700' : 'text-gray-700'}`}>All</span>
            </button>
            {allDepts.map(dept => {
              const count = allEmployees.filter(e => e.department === dept).length;
              const isActive = selectedDepts.includes(dept);
              return (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-2.5 min-w-[100px] transition-all border-b-2 text-center ${isActive
                      ? 'border-blue-500 bg-blue-50/60 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                >
                  <span className={`text-xs font-bold truncate max-w-[90px] ${isActive ? 'text-blue-700' : 'text-gray-700'}`} title={dept}>{dept}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Employees"
          value={totalEmployeesCount}
          icon={Users}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)}
        />
        <StatCard
          label="Bench Employees"
          value={benchEmployeesCount}
          icon={BriefcaseBusiness}
          colorClass="bg-orange-500"
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
        <NewJoinerCard isActive={cardFilter === 'new-joiner'} onClick={() => setCardFilter('new-joiner')} />
        <StatCard
          label="Skills Overview"
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
          employees={allEmployees}
          loading={loading}
          onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id || '123'}`, { state: { employee: emp } })}
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
            {activeDrawer === 'skills' ? 'Skills Overview' : 'Utilization Trend'}
          </h2>
          <button
            onClick={() => setActiveDrawer(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeDrawer === 'skills' && <SkillsOverview employees={allEmployees} />}
          {activeDrawer === 'trend' && <UtilizationTrend employees={allEmployees} />}
        </div>
      </div>

      {/* Backdrop */}
      {activeDrawer && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setActiveDrawer(null)}
        />
      )}
    </div>
  )
}

export default Employee