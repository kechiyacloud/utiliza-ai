import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Search, Filter, Trophy } from 'lucide-react'
import EmployeeTable from './employee/EmployeeTable'
import NewJoinerCard from './employee/NewJoinerCard'
import FilterOverlay from './employee/FilterOverlay'
import EmployeeInsights from './employee/insights/EmployeeInsights'
import { getEmployeeList } from '../api/employeeApi'

const StatCard = ({ label, value, icon: Icon, colorClass, loading, error, onClick }) => (
  <div
    className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md cursor-pointer"
    onClick={onClick}
  >
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <h3 className="text-xl font-extrabold text-gray-800">
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
  const [totalEmployee, setTotalEmployee] = useState(null)
  const [benchEmployee, setBenchEmployee] = useState(null)
  const [noticeEmployee, setNoticeEmployee] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allEmployees, setAllEmployees] = useState([]); // Need all employees for filter counts

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    departments: [],
    types: [],
    skills: [],
    locations: [],
    statusTags: []
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilter, setCardFilter] = useState(null); // For quick filters from cards

  useEffect(() => {
    let mounted = true

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Single call — counts are derived from the list (works with mock data too)
        const data = await getEmployeeList()
        if (!mounted) return

        setAllEmployees(data)
        setTotalEmployee(data.length)
        setBenchEmployee(data.filter(e => e.employee_status === 'Bench').length)
        setNoticeEmployee(data.filter(e => e.employee_status === 'Notice period').length)
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAllData()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6 flex flex-col gap-6 w-full h-full overflow-y-auto relative">
      <FilterOverlay
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        employees={allEmployees}
      />

      {/* Header & Secondary Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Management</h1>
          <p className="text-gray-500">Manage your workforce, track status, and view details.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search skills, name, status, etc..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-64 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Button - Moved & Styled */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-blue-200 transition-all shadow-sm"
          >
            <Filter size={18} />
            Filter
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



      {/* Stats Cards - 4 Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Employees"
          value={totalEmployee}
          icon={Users}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          onClick={() => setCardFilter(null)} // Reset filters to show all employees
        />
        <StatCard
          label="Bench Employees"
          value={benchEmployee}
          icon={BriefcaseBusiness}
          colorClass="bg-orange-500"
          loading={loading}
          error={error}
          onClick={() => setCardFilter('bench')}
        />
        <StatCard
          label="Notice Period"
          value={noticeEmployee}
          icon={Hourglass}
          colorClass="bg-red-500"
          loading={loading}
          error={error}
          onClick={() => setCardFilter('notice')}
        />
        <NewJoinerCard onClick={() => setCardFilter('new-joiner')} />
      </div>

      {/* Employee Insights Dashboard (Tabs) */}
      <div className="w-full">
        <EmployeeInsights employees={allEmployees} filters={{
          ...filters,
          search: searchQuery,
          cardFilter: cardFilter
        }} />
      </div>

      {/* Employee Table (Full Width) */}
      <div className='flex-1 w-full'>
        <EmployeeTable
          onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id || '123'}`, { state: { employee: emp } })}
          filters={{
            ...filters,
            search: searchQuery,
            cardFilter: cardFilter // Pass card filter
          }}
        />
      </div>
    </div>
  )
}

export default Employee