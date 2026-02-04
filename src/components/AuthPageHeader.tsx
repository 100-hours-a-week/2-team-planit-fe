import { useNavigate } from 'react-router-dom'

type AuthPageHeaderProps = {
  ctaLabel: string
  ctaRoute: string
}

export default function AuthPageHeader({ ctaLabel, ctaRoute }: AuthPageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="auth-header">
      <h1 className="logo-title">
        <button type="button" className="logo-button" onClick={() => navigate('/')}>
          PlanIt
        </button>
      </h1>
      <div className="header-actions">
        <button type="button" className="text-link" onClick={() => navigate(ctaRoute)}>
          {ctaLabel}
        </button>
      </div>
    </header>
  )
}
