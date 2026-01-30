import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store'

type Props = {
  children: ReactElement
}

export default function PrivateRoute({ children }: Props) {
  const location = useLocation()
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
