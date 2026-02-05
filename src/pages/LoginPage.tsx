import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthPageHeader from '../components/AuthPageHeader'
import { login } from '../api/auth'
import { useAuth } from '../store'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loginIdTouched, setLoginIdTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loginIdError = loginIdTouched && loginId.length === 0 ? '*아이디를 입력해주세요.' : ''

  const passwordError = passwordTouched
    ? password.length === 0
      ? '*비밀번호를 입력해주세요.'
      : ''
    : ''

  const isFormValid = loginIdError === '' && passwordError === '' && loginId.length > 0 && password.length > 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginIdTouched(true)
    setPasswordTouched(true)
    setErrorMessage('')

    if (!isFormValid) {
      return
    }

    setIsSubmitting(true)
    try {
      const data = await login({ loginId, password })
      const userPayload = {
        id: data.userId,
        loginId: data.loginId,
        nickname: data.nickname,
        profileImageUrl: data.profileImageUrl ?? null,
      }
      setAuth({ user: userPayload, accessToken: data.accessToken })
      navigate('/')
    } catch {
      setErrorMessage('*아이디 또는 비밀번호를 확인해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthPageHeader ctaLabel="회원가입" ctaRoute="/signup" />
      <main className="page-shell">
        <div className="form-card">
        <header className="form-header">
          <h1>Planit 로그인</h1>
          <p className="subtitle">아이디와 비밀번호를 입력하고 나만의 계획을 확인하세요.</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginId">아이디</label>
            <input
              id="loginId"
              name="loginId"
              className="text-input"
              value={loginId}
              onChange={(event) => {
                setLoginId(event.target.value)
                setLoginIdTouched(true)
              }}
              onBlur={() => setLoginIdTouched(true)}
              placeholder="아이디를 입력해주세요"
              autoComplete="username"
            />
            {loginIdError && <p className="error-text">{loginIdError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordTouched(true)
              }}
              onBlur={() => setPasswordTouched(true)}
              placeholder="비밀번호를 입력해주세요"
              autoComplete="current-password"
            />
            {passwordError && <p className="error-text">{passwordError}</p>}
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <button className="primary-btn" type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <footer className="form-footer">
          <span>계정이 없으신가요?</span>
          <button type="button" className="text-link" onClick={() => navigate('/signup')}>
            회원가입
          </button>
        </footer>
        </div>
      </main>
    </>
  )
}
