import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, deletePostImageByKey, getPostPresignedUrl } from '../api/posts'
import Toast from '../components/Toast'

const BOARD_DESCRIPTION = '자유게시판에서는 여행과 일정 정보, 경험을 나누는 공간입니다.'
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

function getFileExtension(file: File): string {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop()! : ''
  return ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number]) ? ext : 'jpg'
}

export default function PostCreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageKeys, setImageKeys] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)

  const showToast = (message: string) => {
    setToastInfo({ message, key: Date.now() })
  }

  useEffect(() => {
    return () => {
      setToastInfo(null)
    }
  }, [])

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imageFiles])

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    const selected = Array.from(files).filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast('이미지 크기는 최대 5MB까지 허용됩니다.')
        return false
      }
      return true
    })
    const toAdd = selected.slice(0, Math.max(0, 5 - imageFiles.length))
    if (selected.length > toAdd.length) {
      showToast('이미지는 최대 5장까지 업로드 가능합니다.')
    }
    event.target.value = ''

    for (const file of toAdd) {
      try {
        const ext = getFileExtension(file)
        const { uploadUrl, key } = await getPostPresignedUrl(ext, file.type || 'image/jpeg')
        // Presigned URL은 PUT용. redirect를 따르면 브라우저가 GET으로 바꿔 서명 불일치(403)가 난다.
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: await file.arrayBuffer(),
          redirect: 'manual',
        })
        if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
          const location = response.headers.get('Location') || '(none)'
          console.error('S3 redirect detected', response.status, location)
          throw new Error(`S3 리다이렉트 발생. 버킷 리전이 ap-northeast-2인지 확인하세요. Location: ${location}`)
        }
        if (!response.ok) {
          const body = await response.text()
          console.error('S3 PUT failed', response.status, body)
          throw new Error(body || '업로드 실패')
        }
        setImageFiles((prev) => [...prev, file])
        setImageKeys((prev) => [...prev, key])
      } catch {
        showToast('이미지 업로드에 실패했습니다.')
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    const keyToDelete = imageKeys[index]
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index))
    setImageKeys((prev) => prev.filter((_, idx) => idx !== index))
    if (keyToDelete) {
      deletePostImageByKey(keyToDelete).catch(() => {})
    }
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
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const result = await createPost({
        boardType,
        title: title.trim(),
        content: content.trim(),
        imageKeys: imageKeys.length > 0 ? imageKeys : undefined,
      })
      navigate(`/posts/${result.postId}`)
    } catch {
      showToast('게시글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentHint = useMemo(() => `${content.length}/2000`, [content.length])
  const isFormValid = Boolean(title.trim() && content.trim())
  const boardType = 'FREE'

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
          <label>이미지 (최대 5장, 5MB 이하)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
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
