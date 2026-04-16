import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppDataProvider } from './context'
import ProtectedRoute from './ProtectedRoute'

const LoginRegister = lazy(() => import('./LoginRegister'))
const Login = lazy(() => import('./login-register/Login'))
const Register = lazy(() => import('./login-register/Register'))
const Verify = lazy(() => import('./login-register/Verify'))
const MainDashboard = lazy(() => import('./MainDashboard'))
const Dashboard = lazy(() => import('./dashboard/Dashboard'))
const Projects = lazy(() => import('./dashboard/Projects'))
const Availability = lazy(() => import('./dashboard/Availability'))
const Settings = lazy(() => import('./dashboard/Settings'))
const Client = lazy(() => import('./dashboard/Client'))
const Allocations = lazy(() => import('./dashboard/Allocations'))
const Employee = lazy(() => import('./dashboard/Employee'))
const EmployeeDetails = lazy(() => import('./dashboard/employee/EmployeeDetails'))
const EmployeeMasterList = lazy(() => import('./dashboard/employee/EmployeeMasterList'))
const AddEmployee = lazy(() => import('./dashboard/employee/AddEmployee'))
const ProjectDetailsPage = lazy(() => import('./dashboard/projects/ProjectDetailsPage'))
const AddProjectPage = lazy(() => import('./dashboard/projects/AddProjectPage'))
const ImportResourcesPage = lazy(() => import('./dashboard/projects/ImportResourcesPage'))
const FullAnalytics = lazy(() => import('./dashboard/FullAnalytics'))
const Organization = lazy(() => import('./dashboard/Organization'))
const WorkStatus = lazy(() => import('./dashboard/WorkStatus'))

import ErrorBoundary from './components/ErrorBoundary'

function RouteLoader({ label = 'Loading page...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/25 border-t-blue-500"></div>
        <p className="text-sm font-medium tracking-wide">{label}</p>
      </div>
    </div>
  )
}

function withSuspense(element, label) {
  return (
    <Suspense fallback={<RouteLoader label={label} />}>
      {element}
    </Suspense>
  )
}

function App() {
  return (
    <AppDataProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>

          {/* AUTH LAYOUT ROUTE */}
          <Route path='/' element={withSuspense(<LoginRegister />, 'Loading sign in...')}>
            <Route index element={withSuspense(<Login />, 'Loading sign in...')} />
            <Route path='login' element={withSuspense(<Login />, 'Loading sign in...')} />
            <Route path='register' element={withSuspense(<Register />, 'Loading registration...')} />
            <Route path='verify' element={withSuspense(<Verify />, 'Loading verification...')} />
          </Route>

          {/* DASHBOARD — protected: requires login token */}
          <Route path='/info' element={<ProtectedRoute />}>
            <Route element={withSuspense(<MainDashboard />, 'Loading workspace...')}>
              <Route index element={withSuspense(<Dashboard />, 'Loading dashboard...')} />
              <Route path='dashboard' element={withSuspense(<Dashboard />, 'Loading dashboard...')} />
              <Route path='projects' element={withSuspense(<Projects />, 'Loading projects...')} />
              <Route path='projects/add' element={withSuspense(<AddProjectPage />, 'Loading add project...')} />
              <Route path='projects/:id' element={withSuspense(<ProjectDetailsPage />, 'Loading project details...')} />
              <Route path='projects/:id/allocation' element={withSuspense(<ProjectDetailsPage />, 'Loading project details...')} />
              <Route path='projects/:projectId/import' element={withSuspense(<ImportResourcesPage />, 'Loading import...')} />
              <Route path='employee' element={withSuspense(<Employee />, 'Loading employees...')} />
              <Route path='employee/add' element={withSuspense(<AddEmployee />, 'Loading employee form...')} />
              <Route path='employee/:id' element={withSuspense(<EmployeeDetails />, 'Loading employee details...')} />
              <Route path='employees/list' element={withSuspense(<EmployeeMasterList />, 'Loading employee list...')} />
              <Route path='client' element={withSuspense(<Client />, 'Loading clients...')} />
              <Route path='allocation' element={withSuspense(<Allocations />, 'Loading allocations...')} />
              <Route path='availability' element={withSuspense(<Availability />, 'Loading availability...')} />
              <Route path='organization' element={withSuspense(<Organization />, 'Loading organization...')} />
              <Route path='settings' element={withSuspense(<Settings />, 'Loading settings...')} />
              <Route path='analytics' element={withSuspense(<FullAnalytics />, 'Loading analytics...')} />
              <Route path='WorkStatus' element={withSuspense(<WorkStatus />, 'Loading Status ...')} />
            </Route>
          </Route>

          {/* FALLBACK */}
          <Route path='*' element={<Navigate to='/' />} />

        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </AppDataProvider>
  )
}

export default App