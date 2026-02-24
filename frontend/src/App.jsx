// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppDataProvider } from './context'

// Layout
import LoginRegister from './LoginRegister'

// Forms
import Login from './login-register/Login'
import Register from './login-register/Register'
import Verify from './login-register/Verify'

// Protected Dashboard (example)
import ProtectedRoute from './ProtectedRoute'
import MainDashboard from './MainDashboard'
import Dashboard from './dashboard/Dashboard'
import Projects from './dashboard/Projects'
import Settings from './dashboard/Settings'
import Client from './dashboard/Client'
import Allocations from './dashboard/Allocations'
import Employee from './dashboard/Employee'
import EmployeeDetails from './dashboard/employee/EmployeeDetails'
import EmployeeMasterList from './dashboard/employee/EmployeeMasterList'
import AddEmployee from './dashboard/employee/AddEmployee'
import Organization from './dashboard/Organization'
// import DataInfrastructureTest from './test/DataInfrastructureTest'
function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Routes>

          {/* AUTH LAYOUT ROUTE */}
          <Route path='/' element={<LoginRegister />}>
            <Route index element={<Login />} />           {/* default */}
            <Route path='login' element={<Login />} />
            <Route path='register' element={<Register />} />
            <Route path='verify' element={<Verify />} />
          </Route>

          <Route path='/info' element={<MainDashboard />} >
            <Route index element={<Dashboard />} />
            <Route path='dashboard' element={<Dashboard />} />
            <Route path='projects' element={<Projects />} />
            <Route path='employee' element={<Employee />} />
            <Route path='employee/add' element={<AddEmployee />} />
            <Route path='employee/:id' element={<EmployeeDetails />} />
            <Route path='employees/list' element={<EmployeeMasterList />} />
            <Route path='client' element={<Client />} />
            <Route path='allocation' element={<Allocations />} />
            <Route path='organization' element={<Organization />} />
            <Route path='settings' element={<Settings />} />
            {/* <Route path='test' element={<DataInfrastructureTest />} /> */}
          </Route>

          {/* PROTECTED ROUTES */}
          {/* <Route element={<ProtectedRoute />}>
          <Route path='/info' element={<MainDashboard />} >
            <Route index element={<Dashboard />} />       
            <Route path='dashboard' element={<Dashboard />} />
            <Route path='projects' element={<Projects />} />
            <Route path='employee' element={<Employee />} />
            <Route path='client' element={<Client />} />
            <Route path='allocation' element={<Allocations />} />
            <Route path='settings' element={<Settings />} />          
          </Route>
        </Route> */}

          {/* FALLBACK */}
          <Route path='*' element={<Navigate to='/' />} />

        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  )
}

export default App

