import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store'

export default function PrivateRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
