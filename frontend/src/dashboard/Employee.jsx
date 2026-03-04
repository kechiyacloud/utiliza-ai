import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BriefcaseBusiness, Hourglass, UserPlus, Search, Filter, Trophy, Award, TrendingUp, X } from 'lucide-react'
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
  const [activeDrawer, setActiveDrawer] = useState(null); // 'skills' | 'trend' | null

  useEffect(() => {
    let mounted = true

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Single call — counts are derived from the list
        const data = await getEmployeeList()
        if (!mounted) return

        setAllEmployees(data)
        setTotalEmployee(data.length)
        setBenchEmployee(data.filter(e => (e.employee_status || '').toLowerCase() === 'bench').length)
        setNoticeEmployee(data.filter(e => (e.employee_status || '').toLowerCase().includes('notice')).length)
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

          {/* Utilization Trend Icon Button */}
          <button
            onClick={() => setActiveDrawer('trend')}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-200 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-all shadow-sm"
            title="Utilization Trend"
          >
            <TrendingUp size={18} />
          </button>

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



      {/* Stats Cards - 5 Column Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Employees"
          value={totalEmployee}
          icon={Users}
          colorClass="bg-blue-500"
          loading={loading}
          error={error}
          isActive={cardFilter === null}
          onClick={() => setCardFilter(null)} // Reset filters to show all employees
        />
        <StatCard
          label="Bench Employees"
          value={benchEmployee}
          icon={BriefcaseBusiness}
          colorClass="bg-orange-500"
          loading={loading}
          error={error}
          isActive={cardFilter === 'bench'}
          onClick={() => setCardFilter('bench')}
        />
        <StatCard
          label="Notice Period"
          value={noticeEmployee}
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

      {/* Employee Table (Full Width) */}
      <div className='flex-1 w-full mt-4'>
        <EmployeeTable
          onEmployeeClick={(emp) => navigate(`/info/employee/${emp.employee_id || '123'}`, { state: { employee: emp } })}
          filters={{
            ...filters,
            search: searchQuery,
            cardFilter: cardFilter
          }}
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