import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { getPost, updatePostForm } from '../api/posts'
import type { PostDetail } from '../api/posts'
import { useAuth } from '../store'

const BOARD_DESCRIPTION = '자유게시판에서는 여행과 일정 정보, 경험을 나누는 공간입니다.'

export default function PostEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [detail, setDetail] = useState<PostDetail | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)

  const isAuthor = Boolean(detail && user && detail.author.authorId === user.id)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  useEffect(() => {
    const postId = Number(id)
    if (!id || Number.isNaN(postId)) {
      setError('잘못된 게시글입니다.')
      setIsLoading(false)
      return
    }
    let cancelled = false
    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const response = await getPost(String(postId))
        if (cancelled) {
          return
        }
        setDetail(response)
        setTitle(response.title)
        setContent(response.content)
      } catch {
        if (!cancelled) {
          setError('게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [images])

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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) {
      return
    }
    const selected = Array.from(files)
    if (images.length + selected.length > 5) {
      showToast('이미지는 최대 5장까지 업로드 가능합니다.')
    }
    const toAdd = selected.slice(0, Math.max(0, 5 - images.length))
    const validFiles = toAdd.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast('이미지 크기는 최대 5MB까지 허용됩니다.')
        return false
      }
      return true
    })
    setImages((prev) => [...prev, ...validFiles])
    event.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail) {
      showToast('게시글 정보를 가져오지 못했습니다.')
      return
    }
    if (!isAuthor) {
      showToast('게시글 작성자만 수정할 수 있습니다.')
      return
    }
    if (!validate()) {
      return
    }
    const form = new FormData()
    form.append('boardType', 'FREE')
    form.append('title', title.trim())
    form.append('content', content.trim())
    images.forEach((file) => form.append('images', file))
    setIsSubmitting(true)
    try {
      const result = await updatePostForm(detail.postId, form)
      navigate(`/posts/${result.postId}`)
    } catch {
      showToast('게시글 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentHint = useMemo(() => `${content.length}/2000`, [content.length])
  const isFormValid = Boolean(title.trim() && content.trim())

  return (
    <main className="post-create-shell">
      <header className="post-create-header">
        <h1>게시글 수정</h1>
        <p>{BOARD_DESCRIPTION}</p>
      </header>
      {isLoading && <p className="post-status">게시글 정보를 불러오는 중...</p>}
      {error && <p className="post-status post-status--error">{error}</p>}
      {!isLoading && !error && detail && (
        <form className="post-create-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="board-select">게시판</label>
            <select id="board-select" value="FREE" disabled>
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
            <label htmlFor="image-upload">이미지 (최대 5장, 5MB 이하)</label>
            <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageChange} />
            {previews.length > 0 && (
              <div className="image-preview-grid">
                {previews.map((src, index) => (
                  <figure key={`${src}-${index}`}>
                    <img src={src} alt={`선택한 이미지 ${index + 1}`} />
                    <button type="button" onClick={() => handleRemoveImage(index)}>
                      삭제
                    </button>
                  </figure>
                ))}
              </div>
            )}
            {detail.images.length > 0 && (
              <div className="form-hint">
                기존 이미지 {detail.images.length}장(교체 불가, 새로운 업로드 시 추가됨)
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => navigate(`/posts/${detail.postId}`)}>
              취소
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? '수정 중...' : '수정하기'}
            </button>
          </div>
        </form>
      )}
      {toastInfo && <Toast key={toastInfo.key} message={toastInfo.message} onClose={() => setToastInfo(null)} />}
    </main>
  )
}
