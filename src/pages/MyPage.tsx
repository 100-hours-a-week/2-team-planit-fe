import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProfileDropdown from '../components/ProfileDropdown'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import {
  checkNickname,
  getMyPage,
  updateProfile,
  withdrawUser,
  getProfilePresignedUrl,
  saveProfileImageKey,
  deleteProfileImage,
  type MyPageResponse,
} from '../api/users'
import { deletePlan, fetchPlans } from '../api/plans'
import { useAuth, type User } from '../store'
import { DEFAULT_AVATAR_URL } from '../constants/avatar'
import { resolveImageUrl } from '../utils/image.ts'

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/
const LOGIN_HELPER = '아이디는 영문 소문자와 숫자, _ 만 사용이 가능함'
const NICKNAME_HELPER = '*닉네임은 공백 없이 최대 10자까지 입력할 수 있으며, 이모지는 사용할 수 없습니다.'
const emojiRegex = /\p{Emoji}/u

type PlanItem = {
  id: number
  title: string
  status: string
  boardType: string
  leader?: boolean
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: {
        data?: { message?: string } | string
      }
      message?: string
    }
    const data = err.response?.data
    if (data) {
      if (typeof data === 'string') {
        return data
      }
      return data.message || fallback
    }
    if (err.message) {
      return err.message
    }
  }
  return fallback
}

export default function MyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, accessToken, setAuth, clearAuth } = useAuth()
  const authUser = user
  const [pageStats, setPageStats] = useState<MyPageResponse | null>(null)
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [planError, setPlanError] = useState('')
  const [rowsLoading, setRowsLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [nickname, setNickname] = useState('')
  const [initialNickname, setInitialNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nicknameChecked, setNicknameChecked] = useState(false)
  const [lastCheckedNickname, setLastCheckedNickname] = useState<string | null>(null)
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'available' | 'taken'>('idle')
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordConfirmError, setPasswordConfirmError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const nicknameHasError = Boolean(nicknameError)
  const needNicknameCheck = nickname !== initialNickname
  const passwordDirty = password.trim().length > 0 || passwordConfirm.trim().length > 0
  const canSave =
    (needNicknameCheck ? !nicknameHasError && nicknameChecked && lastCheckedNickname === nickname : true) &&
    (!passwordDirty || (!passwordError && !passwordConfirmError)) &&
    (needNicknameCheck || passwordDirty)

  const disableDropdown = location.pathname === '/mypage'
  useEffect(() => {
    if (disableDropdown) {
      setDropdownOpen(false)
    }
  }, [disableDropdown])

  const handleAvatarTrigger = () => {
    if (disableDropdown) {
      return
    }
    setDropdownOpen((prev) => !prev)
  }

  const handleNavigateLogin = () => {
    setDropdownOpen(false)
    navigate('/login')
  }

  const handleNavigateSignup = () => {
    setDropdownOpen(false)
    navigate('/signup')
  }

  const handleNavigateMyPage = () => {
    setDropdownOpen(false)
    navigate('/mypage')
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    clearAuth()
    navigate('/login', { replace: true })
  }

  const planList = useMemo(() => {
    if (plans.length > 0) {
      return plans
    }
    if (!pageStats) {
      return []
    }
    return pageStats.planPreviews.map((preview) => ({
      id: preview.postId,
      title: preview.title,
      status: preview.status ?? '내 계획',
      boardType: preview.boardType,
      leader: false,
    }))
  }, [plans, pageStats])

  useEffect(() => {
    let cancelled = false

    if (!authUser) {
      setPageStats(null)
      setLoading(false)
      setError('')
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError('')
    setNickname(authUser.nickname)
    setInitialNickname(authUser.nickname)
    setLastCheckedNickname(authUser.nickname)
    setNicknameChecked(true)
    setNicknameStatus('idle')

    getMyPage()
      .then((pageData) => {
        if (!cancelled) {
          setPageStats(pageData)
        }
      })
      .catch((fetchError: unknown) => {
        const message = getErrorMessage(fetchError, '정보를 불러오지 못했습니다.')
        if (!cancelled) {
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authUser])

  useEffect(() => {
    let cancelled = false
    if (!authUser) {
      setPlans([])
      setPlanError('')
      setRowsLoading(false)
      return () => {
        cancelled = true
      }
    }
    setRowsLoading(true)
    setPlanError('')
    fetchPlans()
      .then((list) => {
        if (cancelled) {
          return
        }
        setPlans(
          list.map((plan) => ({
            id: plan.planId,
            title: plan.title,
            status: plan.status,
            boardType: plan.boardType,
            leader: plan.leader,
          })),
        )
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setPlanError(getErrorMessage(fetchError, '*내 계획을 불러오지 못했습니다.'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRowsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [authUser])

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const validateNickname = (value: string) => {
    if (!value.trim()) {
      return '*닉네임을 입력해주세요.'
    }
    if (value.length > 10) {
      return '*닉네임은 최대 10자까지 작성 가능합니다.'
    }
    if (value.includes(' ')) {
      return '*닉네임에는 공백을 사용할 수 없습니다.'
    }
    if (emojiRegex.test(value)) {
      return '*닉네임에는 이모지를 사용할 수 없습니다.'
    }
    return null
  }

  const validatePassword = (value: string) => {
    if (!value.trim()) {
      return '*비밀번호를 입력해주세요.'
    }
    if (!PASSWORD_REGEX.test(value)) {
      return '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.'
    }
    return null
  }

  const validatePasswordConfirm = (value: string) => {
    if (!value.trim()) {
      return '*비밀번호를 한 번 더 입력해주세요.'
    }
    if (value !== password) {
      return '*비밀번호와 다릅니다.'
    }
    return null
  }

  const handleNicknameChange = (value: string) => {
    if (nicknameError && value === nickname) {
      setNicknameError(null)
    }
    setNickname(value)
    const matchesLast = lastCheckedNickname !== null && value === lastCheckedNickname
    setNicknameChecked(matchesLast)
    setNicknameStatus(matchesLast ? 'available' : 'idle')
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (passwordError) {
      setPasswordError(validatePassword(value))
    }
    if (passwordConfirm.length > 0) {
      setPasswordConfirmError(validatePasswordConfirm(passwordConfirm))
    }
  }

  const handlePasswordConfirmChange = (value: string) => {
    setPasswordConfirm(value)
    if (passwordConfirmError) {
      setPasswordConfirmError(validatePasswordConfirm(value))
    }
  }

  const triggerFilePicker = () => {
    fileInputRef.current?.click()
  }

  const [profileImageUploading, setProfileImageUploading] = useState(false)

  const handleProfileImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('이미지 크기는 최대 5MB까지 허용됩니다.')
      return
    }
    const ext = file.name.toLowerCase().split('.').pop() || 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setToastMessage('jpg, png, webp 형식만 업로드 가능합니다.')
      return
    }
    event.target.value = ''
    setProfileImageUploading(true)
    try {
      const { uploadUrl, key } = await getProfilePresignedUrl(ext, file.type || 'image/jpeg')
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: await file.arrayBuffer(),
        redirect: 'manual',
      })
      if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
        console.error('S3 redirect detected', response.status, response.headers.get('Location'))
        throw new Error('S3 리다이렉트 발생. 버킷 리전이 ap-northeast-2인지 확인하세요.')
      }
      if (!response.ok) throw new Error('업로드 실패')
      const updated = await saveProfileImageKey(key)
      setAuth({ user: { ...authUser!, profileImageUrl: updated.profileImageUrl ?? null }, accessToken: accessToken! })
      setAvatarPreview(URL.createObjectURL(file))
      setToastMessage('프로필 이미지가 변경되었습니다.')
    } catch {
      setToastMessage('프로필 이미지 업로드에 실패했습니다.')
    } finally {
      setProfileImageUploading(false)
    }
  }

  const handleDeleteProfileImage = async () => {
    try {
      await deleteProfileImage()
      setAuth({ user: { ...authUser!, profileImageUrl: null }, accessToken: accessToken! })
      setAvatarPreview(null)
      setToastMessage('프로필 이미지가 삭제되었습니다.')
    } catch {
      setToastMessage('프로필 이미지 삭제에 실패했습니다.')
    }
  }

  const handleNicknameCheck = async () => {
    const trimmed = nickname.trim()
    const errorText = validateNickname(trimmed)
    if (errorText) {
      setNicknameError(errorText)
      setNicknameStatus('idle')
      return
    }
    try {
      const result = await checkNickname(trimmed)
      if (!result.available) {
        setNicknameError('*중복된 닉네임입니다.')
        setNicknameChecked(false)
        setNicknameStatus('taken')
        return
      }
      setNicknameError(null)
      setNicknameChecked(true)
      setLastCheckedNickname(trimmed)
      setNicknameStatus('available')
    } catch {
      setNicknameError('*닉네임을 확인할 수 없습니다.')
      setNicknameChecked(false)
      setNicknameStatus('idle')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!authUser) {
      return
    }
    const nicknameValidation = needNicknameCheck ? validateNickname(nickname) : null
    const passwordValidation = passwordDirty ? validatePassword(password) : null
    const confirmValidation = passwordDirty ? validatePasswordConfirm(passwordConfirm) : null

    setNicknameError(nicknameValidation)
    setPasswordError(passwordValidation)
    setPasswordConfirmError(confirmValidation)

    if ((needNicknameCheck && nicknameValidation) || (passwordDirty && (passwordValidation || confirmValidation))) {
      return
    }
    if (needNicknameCheck && !nicknameChecked) {
      setNicknameError('*닉네임 중복 확인이 필요합니다.')
      return
    }

    const payload = {
      nickname,
      ...(passwordDirty
        ? {
            password,
            passwordConfirmation: passwordConfirm,
          }
        : {}),
    }

    try {
      const updated = await updateProfile(payload)
      const nextUser: User = {
        id: updated.userId,
        loginId: updated.loginId,
        nickname: updated.nickname,
        profileImageUrl: updated.profileImageUrl ?? null,
      }
      setAuth({ user: nextUser, accessToken })
      setPageStats((prev) => (prev ? { ...prev, nickname: updated.nickname } : prev))
      setInitialNickname(updated.nickname)
      setEditMode(false)
      setPassword('')
      setPasswordConfirm('')
      setToastMessage('*수정 완료')
    } catch (error: unknown) {
      const message = getErrorMessage(error, '정보 수정에 실패했습니다.')
      setError(message)
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setNickname(initialNickname)
    setPassword('')
    setPasswordConfirm('')
    setNicknameError(null)
    setPasswordError(null)
    setPasswordConfirmError(null)
    setNicknameChecked(initialNickname === authUser?.nickname)
  }

  const handlePlanDelete = async () => {
    if (!deleteTarget) {
      return
    }
    try {
      await deletePlan(deleteTarget.id)
      setPlans((prev) => prev.filter((plan) => plan.id !== deleteTarget.id))
      setToastMessage('*삭제 완료')
    } catch (error: unknown) {
      const message = getErrorMessage(error, '삭제에 실패했습니다.')
      setPlanError(message)
    } finally {
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  const handleWithdraw = async () => {
    try {
      await withdrawUser()
      clearAuth()
      navigate('/login', { replace: true })
    } catch (error: unknown) {
      const message = getErrorMessage(error, '탈퇴 처리 중 오류가 발생했습니다.')
      setError(message)
    }
  }

  const helperLayer = (content: string | null, defaultText: string) => (
    <div className="helper-layer">
      <p className={content ? 'error-text' : 'helper-text'}>{content ?? defaultText}</p>
    </div>
  )

  if (loading) {
    return (
      <main className="page-shell my-page-shell">
        <div className="my-page-card">
          <p>로딩 중입니다...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page-shell my-page-shell">
        <div className="my-page-card">
          <p className="error-text">{error}</p>
        </div>
      </main>
    )
  }

  if (!authUser || !pageStats) {
    return null
  }

  const resolvedAuthAvatar = resolveImageUrl(authUser?.profileImageUrl, DEFAULT_AVATAR_URL)
  const hasAvatar = Boolean(avatarPreview) || Boolean(authUser.profileImageUrl)
  const currentAvatarSrc = avatarPreview ?? resolvedAuthAvatar

  return (
    <main className="page-shell my-page-shell">
      <div className="my-page-card">
        <header className="profile-header">
          <div>
            <button type="button" className="text-link" onClick={() => navigate(-1)}>
              {'<'} 이전
            </button>
            <h1>{authUser.nickname} 님의 마이페이지</h1>
            {helperLayer(null, '활동 요약과 최근 계획을 확인해보세요.')}
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="profile-trigger"
              ref={profileButtonRef}
              onClick={handleAvatarTrigger}
            >
              <div className={`avatar-circle ${hasAvatar ? 'has-image' : ''}`}>
                <img src={currentAvatarSrc} alt={`${authUser.loginId} 프로필`} />
              </div>
            </button>
            <ProfileDropdown
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              anchorRef={profileButtonRef}
              user={authUser}
              onNavigateLogin={handleNavigateLogin}
              onNavigateSignup={handleNavigateSignup}
              onNavigateMyPage={handleNavigateMyPage}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <section className="stats-grid">
          <article>
            <strong>게시물</strong>
            <span>{pageStats.postCount}</span>
          </article>
          <article>
            <strong>댓글</strong>
            <span>{pageStats.commentCount}</span>
          </article>
          <article>
            <strong>좋아요</strong>
            <span>{pageStats.likeCount}</span>
          </article>
          <article>
            <strong>알림</strong>
            <span>{pageStats.notificationCount}</span>
          </article>
        </section>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginId">로그인 아이디</label>
            <input id="loginId" name="loginId" className="text-input" value={authUser.loginId} disabled />
            {helperLayer(null, LOGIN_HELPER)}
          </div>
          <div className="form-group">
            <label htmlFor="nickname">닉네임</label>
            <div className="field-row">
              <input
                id="nickname"
                name="nickname"
                className="text-input"
                value={nickname}
                disabled={!editMode}
                onChange={(event) => handleNicknameChange(event.target.value)}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={handleNicknameCheck}
                disabled={!editMode || nickname.trim() === '' || nickname === lastCheckedNickname}
              >
                중복 확인
              </button>
            </div>
            {helperLayer(
              nicknameError ??
                (nicknameStatus === 'available' ? '*사용 가능한 닉네임입니다.' : null),
              NICKNAME_HELPER,
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              className="text-input"
              type="password"
              value={password}
              disabled={!editMode}
              onChange={(event) => handlePasswordChange(event.target.value)}
            />
            {helperLayer(passwordError, '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.')}
          </div>
          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              className="text-input"
              type="password"
              value={passwordConfirm}
              disabled={!editMode}
              onChange={(event) => handlePasswordConfirmChange(event.target.value)}
            />
            {helperLayer(passwordConfirmError, '*비밀번호를 한 번 더 입력해주세요.')}
          </div>

          <div className="form-actions">
            {!editMode ? (
              <button type="button" className="primary-btn" onClick={() => setEditMode(true)}>
                정보 수정
              </button>
            ) : (
              <>
                <button type="button" className="secondary-btn" onClick={handleCancelEdit}>
                  취소
                </button>
                <button type="submit" className="primary-btn" disabled={!canSave}>
                  저장
                </button>
              </>
            )}
          </div>
        </form>

        <section className="profile-upload">
          <h2>프로필 이미지</h2>
          <p className="helper-text">현재 서버에 등록된 이미지를 기반으로 보여줍니다.</p>
          <div className="avatar-grid">
            <div className="avatar-circle large">
              <img src={currentAvatarSrc} alt={`${authUser.loginId} 프로필`} />
            </div>
            <div className="upload-helpers">
              <button
                type="button"
                className="secondary-btn small"
                onClick={triggerFilePicker}
                disabled={profileImageUploading}
              >
                {profileImageUploading ? '업로드 중...' : '이미지 업로드'}
              </button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                className="avatar-input"
                hidden
                onChange={handleProfileImageSelection}
              />
              {(avatarPreview || authUser?.profileImageUrl) && (
                <button type="button" className="text-link" onClick={handleDeleteProfileImage}>
                  이미지 삭제
                </button>
              )}
              {!avatarPreview && !authUser?.profileImageUrl && (
                <p className="error-text helper-layer-text">*프로필 사진을 추가해주세요.</p>
              )}
            </div>
          </div>
        </section>

        <section className="plan-section">
          <header>
            <h2>내 계획</h2>
          </header>
          {planError && <p className="error-text">{planError}</p>}
          {planList.length === 0 && !rowsLoading && (
            <p className="helper-text helper-fixed">*아직 생성된 계획이 없습니다.</p>
          )}
          <div className="plan-list">
            {planList.map((plan) => (
              <article
                key={plan.id}
                className="plan-card"
                onClick={() => navigate(`/plans/${plan.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(`/plans/${plan.id}`)
                  }
                }}
              >
                <div>
                  <strong>{plan.title}</strong>
                  <p className="plan-meta">
                    {plan.boardType}
                    <span className="dot" />
                    {plan.status}
                  </p>
                </div>
                {plan.leader && (
                  <button
                    type="button"
                    className="plan-card-delete"
                    onClick={(event) => {
                      event.stopPropagation()
                      setDeleteTarget(plan)
                      setDeleteModalOpen(true)
                    }}
                  >
                    삭제
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <div className="danger-zone">
          <button type="button" className="text-link danger" onClick={() => setWithdrawModalOpen(true)}>
            탈퇴하기
          </button>
        </div>

        <Modal
          open={deleteModalOpen}
          title="일정 삭제"
          message="해당 일정을 삭제하시겠습니까?"
          confirmLabel="삭제"
          danger
          onConfirm={handlePlanDelete}
          onCancel={() => setDeleteModalOpen(false)}
        />

        <Modal
          open={withdrawModalOpen}
          title="회원 탈퇴"
          message="회원 탈퇴 시 작성한 게시물과 댓글이 모두 삭제되며 복구할 수 없습니다. 계속 진행하시겠습니까?"
          confirmLabel="탈퇴"
          danger
          onConfirm={handleWithdraw}
          onCancel={() => setWithdrawModalOpen(false)}
        />

        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </div>
    </main>
  )
}