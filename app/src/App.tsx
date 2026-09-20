import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './hooks/useAuth'
import { StaffSessionProvider } from './hooks/useStaffSession'
import { AdminDashboard } from './pages/AdminDashboard'
import { Checkin } from './pages/Checkin'
import { CheckoutSuccess } from './pages/CheckoutSuccess'
import { Home } from './pages/Home'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { MyTickets } from './pages/MyTickets'
import { Staff } from './pages/Staff'
import { TicketView } from './pages/TicketView'

export default function App() {
  return (
    <AuthProvider>
      <StaffSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/book" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/my-tickets"
              element={
                <RequireAuth>
                  <MyTickets />
                </RequireAuth>
              }
            />
            <Route
              path="/ticket/:bookingCode"
              element={
                <RequireAuth>
                  <TicketView />
                </RequireAuth>
              }
            />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/dashboard" element={<AdminDashboard />} />
            <Route path="/checkin" element={<Checkin />} />
          </Routes>
        </BrowserRouter>
      </StaffSessionProvider>
    </AuthProvider>
  )
}
