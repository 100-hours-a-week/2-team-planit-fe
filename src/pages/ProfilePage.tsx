import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getUserProfile, updateProfile, type UserProfileResponse, type UserUpdateRequest } from '../api/users'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [profileImageId, setProfileImageId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        setProfile(data)
        setNickname(data.nickname)
        setProfileImageId(data.profileImageId?.toString() ?? '')
      })
      .catch((err) => {
        const serverMessage =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          '정보를 불러오지 못했습니다.'
        setError(serverMessage)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!profile) {
      return
    }

    const payload: UserUpdateRequest = {
      nickname,
      password: password || undefined,
      passwordConfirmation: passwordConfirmation || undefined,
      profileImageId: profileImageId ? Number(profileImageId) : null,
    }

    try {
      const updated = await updateProfile(payload)
      setProfile(updated)
      setSuccessMessage('정보가 성공적으로 업데이트되었습니다.')
    } catch (err) {
      const serverMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        '수정에 실패했습니다.'
      setError(serverMessage)
    }
  }

  if (loading) {
    return <p>로딩 중...</p>
  }

  return (
    <main className="page-shell">
      <div className="form-card">
        <header className="form-header">
          <h1>내 정보</h1>
          <p className="subtitle">정보를 확인하고 수정할 수 있습니다.</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>로그인 아이디</label>
            <input className="text-input" readOnly value={profile?.loginId ?? ''} />
          </div>
          <div className="form-group">
            <label htmlFor="profileNickname">닉네임</label>
            <input
              id="profileNickname"
              className="text-input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profilePassword">비밀번호</label>
            <input
              id="profilePassword"
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profilePasswordConfirmation">비밀번호 확인</label>
            <input
              id="profilePasswordConfirmation"
              className="text-input"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="profileImageId">프로필 이미지 ID</label>
            <input
              id="profileImageId"
              className="text-input"
              value={profileImageId}
              onChange={(event) => setProfileImageId(event.target.value)}
              placeholder="숫자 또는 빈 칸"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          {successMessage && <p className="helper-text">{successMessage}</p>}
          <button className="primary-btn" type="submit">
            정보 수정
          </button>
        </form>
      </div>
    </main>
  )
}
