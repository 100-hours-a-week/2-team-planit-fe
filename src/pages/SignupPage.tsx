import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { signup } from '../api/auth'
import { checkLoginId, checkNickname, getSignupProfilePresignedUrl } from '../api/users'
import type { FormEvent } from 'react'
import AuthPageHeader from '../components/AuthPageHeader'

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/

type FieldErrors = {
  loginId?: string
  nickname?: string
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [profileImageKey, setProfileImageKey] = useState<string | null>(null)
  const [profileImageUploading, setProfileImageUploading] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoginIdChecked, setIsLoginIdChecked] = useState(false)
  const [isNicknameChecked, setIsNicknameChecked] = useState(false)
  const [loginIdInfo, setLoginIdInfo] = useState('')
  const [nicknameInfo, setNicknameInfo] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const shouldCheckLoginId = LOGIN_ID_PATTERN.test(loginId)
  const shouldCheckNickname = nickname.length > 0 && nickname.length <= 10 && !/\s/.test(nickname)

  const canSubmit =
    isLoginIdChecked &&
    isNicknameChecked &&
    password === passwordConfirm &&
    PASSWORD_PATTERN.test(password)

  const handleLoginIdChange = (value: string) => {
    setLoginId(value)
    setIsLoginIdChecked(false)
    setLoginIdInfo('')
    setFieldErrors((prev) => ({ ...prev, loginId: undefined }))
  }

  const handleNicknameChange = (value: string) => {
    setNickname(value)
    setIsNicknameChecked(false)
    setNicknameInfo('')
    setFieldErrors((prev) => ({ ...prev, nickname: undefined }))
  }

  const handleLoginIdCheck = async () => {
    if (!shouldCheckLoginId) {
      setLoginIdInfo('*아이디 형식을 확인해주세요.')
      setIsLoginIdChecked(false)
      return
    }
    try {
      const result = await checkLoginId(loginId)
      setIsLoginIdChecked(result.available)
      setLoginIdInfo(result.available ? '*사용 가능한 아이디입니다.' : '*중복된 아이디 입니다.')
    } catch {
      setIsLoginIdChecked(false)
      setLoginIdInfo('*아이디 확인에 실패했습니다.')
    }
  }

  const handleNicknameCheck = async () => {
    if (!shouldCheckNickname) {
      setNicknameInfo('*닉네임을 확인해주세요.')
      setIsNicknameChecked(false)
      return
    }
    try {
      const result = await checkNickname(nickname)
      setIsNicknameChecked(result.available)
      setNicknameInfo(result.available ? '*사용 가능한 닉네임입니다.' : '*중복된 닉네임 입니다.')
    } catch {
      setIsNicknameChecked(false)
      setNicknameInfo('*닉네임 확인에 실패했습니다.')
    }
  }

  const clearProfileImage = useCallback(() => {
    setProfilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setProfileImageKey(null)
  }, [])

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview)
    }
  }, [profilePreview])

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null
    event.currentTarget.value = ''
    if (!file) return
    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
      setErrorMessage('*jpg, png, webp 형식만 업로드 가능합니다.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('*이미지 크기는 최대 5MB까지 허용됩니다.')
      return
    }
    setErrorMessage('')
    setProfileImageUploading(true)
    setProfilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setProfileImageKey(null)
    try {
      const { uploadUrl, key } = await getSignupProfilePresignedUrl(ext, file.type || 'image/jpeg')
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      })
      if (!response.ok) throw new Error('업로드 실패')
      setProfileImageKey(key)
      setProfilePreview(URL.createObjectURL(file))
    } catch {
      setErrorMessage('*프로필 이미지 업로드에 실패했습니다.')
    } finally {
      setProfileImageUploading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!canSubmit) {
      setErrorMessage('*모든 항목을 정확히 입력하고 중복 확인을 완료해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await signup({
        loginId,
        password,
        passwordConfirm,
        nickname,
        profileImageKey: profileImageKey ?? undefined,
      })
      navigate('/login')
    } catch (error) {
      let remainingErrorMessage = '*회원가입에 실패했습니다.'
      if (error && typeof error === 'object') {
        const axiosError = error as AxiosError<{ code?: string; message?: string }>
        const code = axiosError.response?.data?.code
        switch (code) {
          case 'USER_DUPLICATE_NICKNAME':
            setFieldErrors((prev) => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }))
            remainingErrorMessage = ''
            break
          case 'USER_DUPLICATE_LOGIN_ID':
            setFieldErrors((prev) => ({ ...prev, loginId: '이미 사용 중인 아이디입니다.' }))
            remainingErrorMessage = ''
            break
          default:
            remainingErrorMessage =
              axiosError.response?.data?.message || axiosError.message || remainingErrorMessage
        }
      }
      setErrorMessage(remainingErrorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthPageHeader ctaLabel="로그인" ctaRoute="/login" />
      <main className="page-shell">
        <div className="form-card">
        <header className="form-header">
          <h1>Planit 회원가입</h1>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="signupLoginId">아이디</label>
            <div className="field-row">
            <input
              id="signupLoginId"
              name="signupLoginId"
              className="text-input"
              aria-invalid={!!fieldErrors.loginId}
              value={loginId}
              onChange={(event) => handleLoginIdChange(event.target.value)}
              placeholder="영문 소문자, 숫자, _"
              autoComplete="username"
            />
            <button
                type="button"
                className="secondary-btn"
                disabled={!shouldCheckLoginId}
                onClick={handleLoginIdCheck}
              >
                중복 확인
              </button>
            </div>
            <p className={`helper-text${fieldErrors.loginId ? ' helper-text--error' : ''}`}>
              {fieldErrors.loginId || loginIdInfo || '아이디는 4~20자, 영문 소문자/숫자/_만 허용됩니다.'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="signupPassword">비밀번호</label>
            <input
              id="signupPassword"
              name="signupPassword"
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상, 대문자/소문자/숫자/특수문자 포함"
              autoComplete="new-password"
            />
            <p className="helper-text">
              *비밀번호는 8~20자로 대문자/소문자/숫자/특수문자를 각각 한 개 이상 포함해야 합니다.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="signupConfirm">비밀번호 확인</label>
            <input
              id="signupConfirm"
              name="signupConfirm"
              className="text-input"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="비밀번호를 다시 입력해 주세요"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="signupNickname">닉네임</label>
            <div className="field-row">
            <input
              id="signupNickname"
              name="signupNickname"
              className="text-input"
              aria-invalid={!!fieldErrors.nickname}
              value={nickname}
              onChange={(event) => handleNicknameChange(event.target.value)}
              placeholder="공백 없이 10자 이내"
            />
              <button
                type="button"
                className="secondary-btn"
                disabled={!shouldCheckNickname}
                onClick={handleNicknameCheck}
              >
                중복 확인
              </button>
            </div>
            <p className={`helper-text${fieldErrors.nickname ? ' helper-text--error' : ''}`}>
              {fieldErrors.nickname || nicknameInfo || '닉네임은 공백 없이 최대 10자입니다.'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="signupProfile">프로필 사진</label>
            <div className="upload-slot">
              <input
                id="signupProfile"
                name="signupProfile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={profileImageUploading}
                onChange={handleImageChange}
              />
              {profilePreview ? (
                <div className="avatar-preview">
                  <img src={profilePreview} alt="프로필 미리보기" />
                  <button
                    type="button"
                    className="remove-btn"
                    disabled={profileImageUploading}
                    onClick={clearProfileImage}
                  >
                    삭제
                  </button>
                </div>
              ) : (
                profileImageUploading ? '업로드 중…' : '이미지 업로드'
              )}
            </div>
            <p className="helper-text">
              {profilePreview
                ? '이미지가 선택되었습니다. 삭제 후 다시 선택하면 변경됩니다.'
                : '프로필 사진은 선택 사항입니다. (jpg, png, webp, 최대 5MB)'}
            </p>
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <button className="primary-btn" type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? '가입 처리중…' : '회원가입 완료'}
          </button>
        </form>

        <footer className="form-footer">
          <span>이미 계정이 있다면</span>
          <button type="button" className="text-link" onClick={() => navigate('/login')}>
            로그인
          </button>
        </footer>
      </div>
    </main>
  </>
  )
}
