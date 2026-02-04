import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../api/posts'
import Toast from '../components/Toast'

const BOARD_DESCRIPTION = '자유게시판에서는 여행과 일정 정보, 경험을 나누는 공간입니다.'

export default function PostCreatePage() {
  const navigate = useNavigate()
  const [boardType] = useState('FREE')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)

  const toastKeyRef = useRef(0)
  const showToast = (message: string) => {
    setToastInfo({ message, key: ++toastKeyRef.current })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) {
      return
    }
    const selected = Array.from(files)
    if (imageFiles.length + selected.length > 5) {
      showToast('이미지는 최대 5장까지 선택할 수 있습니다.')
    }
    const toAdd = selected.slice(0, Math.max(0, 5 - imageFiles.length))
    setImageFiles((prev) => [...prev, ...toAdd])
    event.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  const validate = () => {
    const nextErrors: typeof errors = {}
    if (!title.trim()) {
      nextErrors.title = '*제목을 입력해주세요.'
    } else if (title.length > 24) {
      nextErrors.title = '*제목은 최대 24자까지 가능합니다.'
    }
    if (!content.trim()) {
      nextErrors.content = '*내용을 입력해주세요.'
    } else if (content.length > 2000) {
      nextErrors.content = '*내용은 최대 2,000자까지 작성 가능합니다.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) {
      return
    }
    const payload = {
      boardType,
      title: title.trim(),
      content: content.trim(),
      imageKeys: [],
    }

    setIsSubmitting(true)
    try {
      const result = await createPost(payload)
      navigate(`/posts/${result.postId}`)
    } catch {
      showToast('게시글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentHint = useMemo(() => `${content.length}/2000`, [content.length])
  const isFormValid = Boolean(title.trim() && content.trim())

  return (
    <main className="post-create-shell">
      <header className="post-create-header">
        <h1>게시글 작성</h1>
        <p>{BOARD_DESCRIPTION}</p>
      </header>
      <form className="post-create-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="board-select">게시판</label>
          <select id="board-select" value={boardType} disabled>
            <option value="FREE">자유게시판</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="post-title">제목</label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={24}
            placeholder="제목을 입력하세요 (최대 24자)"
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="post-content">본문</label>
          <textarea
            id="post-content"
            rows={6}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder="내용을 입력하세요 (최대 2,000자)"
          />
          <p className="form-hint">{contentHint}</p>
          {errors.content && <p className="form-error">{errors.content}</p>}
        </div>
        <div className="form-group">
          <label>이미지 (선택사항 / 추후 업로드 가능)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          {imageFiles.length > 0 && (
            <div className="image-preview-grid">
              {imageFiles.map((file, index) => (
                <figure key={`${file.name}-${index}`}>
                  <p>{file.name}</p>
                  <button type="button" onClick={() => handleRemoveImage(index)}>
                    삭제
                  </button>
                </figure>
              ))}
            </div>
          )}
          <p className="form-hint">이미지 업로드는 서버 이미지 API 준비 시 적용됩니다.</p>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/posts')}>
            취소
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
      {toastInfo && <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />}
    </main>
  )
}
