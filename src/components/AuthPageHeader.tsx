import { useNavigate } from 'react-router-dom'

type AuthPageHeaderProps = {
  ctaLabel: string
  ctaRoute: string
}

export default function AuthPageHeader({ ctaLabel, ctaRoute }: AuthPageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="auth-header">
      <div className="auth-header__content">
        <div className="auth-header__brand">
          <button type="button" className="auth-header__logo" onClick={() => navigate('/')}>
            PlanIt
          </button>
          <p className="auth-header__tagline">계획을 실현할 수 있도록 깔끔하게 안내합니다.</p>
        </div>
        <button
          type="button"
          className="auth-header__cta"
          onClick={() => navigate(ctaRoute)}
        >
          {ctaLabel}
        </button>
      </div>
    </header>
  )
}
