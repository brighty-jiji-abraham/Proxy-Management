import { useState } from 'react'
import './App.css'
import { routes } from './Routes/Routes'
import { Route, Routes, Navigate } from 'react-router-dom'
import AuthLayout from './Layout/AuthLayout'
import Login from './Components/Login'
import { getApiKey } from './api/api'

/**
 * Auth gate.
 *
 * Previously `authStatus` was hardcoded to false with the session check
 * commented out, so only /login ever rendered and the dashboard was
 * unreachable. Login also POSTed to /login on the admin base URL, where no
 * such endpoint exists - that route belongs to the Node service, which needs
 * MongoDB.
 *
 * The credential that actually governs this UI is the proxy's master API key:
 * it is what every write endpoint checks. So the key is the login. It is
 * verified against the proxy on submit. Login can keep it for this browser
 * session or remember it on this device.
 *
 * The Node email/password service is left untouched (services/authSerice.js)
 * if you later want real user accounts in front of this.
 */
function App() {
  const [authStatus, setAuthStatus] = useState(() => Boolean(getApiKey()))

  if (!authStatus) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login onAuthenticated={() => setAuthStatus(true)} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AuthLayout onSignOut={() => setAuthStatus(false)} />}>
        {routes}
      </Route>
    </Routes>
  )
}

export default App
