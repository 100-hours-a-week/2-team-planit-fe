import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost, deletePostImageByKey, getPostPresignedUrl } from '../api/posts'
import Toast from '../components/Toast'

const BOARD_DESCRIPTION = '자유게시판에서는 여행과 일정 정보, 경험을 나누는 공간입니다.'
const MAX_IMAGES = 5
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

function getFileExtension(file: File): string {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase().replace(/^\./, '')
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg'
}

function extractS3ErrorCode(body: string): string | null {
  const match = body.match(/<Code>([^<]+)<\/Code>/)
  return match?.[1] ?? null
}

async function buildUploadFailureMessage(response: Response): Promise<string> {
  const status = response.status
  const text = await response.text().catch(() => '')
  const code = extractS3ErrorCode(text)

  if (status === 403 || code === 'AccessDenied') {
    return 'S3 업로드 권한이 없습니다. AWS 키/버킷 정책을 확인해주세요.'
  }
  if (status === 400 || code === 'SignatureDoesNotMatch') {
    return 'S3 업로드 서명 검증에 실패했습니다. 업로드 Content-Type이 presigned 발급 값과 같은지 확인해주세요.'
  }
  return `이미지 업로드에 실패했습니다. (HTTP ${status})`
}

export default function PostCreatePage() {
  const navigate = useNavigate()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [boardType] = useState('FREE')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageItems, setImageItems] = useState<{ key: string; previewUrl: string }[]>([])
  const [imageUploading, setImageUploading] = useState(false)
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

  useEffect(() => {
    return () => {
      imageItems.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [imageItems])

  const handleImageAdd = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    // 일부 브라우저(특히 macOS/Safari 등)에서 change 시점에 input.files가 아직 비어 있을 수 있음.
    // 한 틱 뒤에 다시 읽어서 FileList가 채워진 뒤 처리한다.
    const readAndUpload = () => {
      const files = input.files
      console.log('[PostCreate] 이미지 선택됨', files?.length ?? 0, '개')
      if (!files?.length) return
      const fileList = Array.from(files).slice(0, MAX_IMAGES)
      input.value = ''
      setImageUploading(true)
      const run = async () => {
        try {
          const added: { key: string; previewUrl: string }[] = []
          const toAdd = fileList
          for (const file of toAdd) {
            const fileExtension = getFileExtension(file)
            const contentType = file.type || 'image/jpeg'
            console.log('[PostCreate] presigned URL 요청 중...', { fileExtension, contentType })
            let uploadUrl: string
            let key: string
            try {
              const res = await getPostPresignedUrl(fileExtension, contentType)
              uploadUrl = res.uploadUrl
              key = res.key
              console.log('[PostCreate] presigned URL 받음, S3 PUT 시도 중...')
            } catch (apiErr: unknown) {
              const ax = apiErr as { response?: { status?: number; data?: unknown } }
              console.error('[PostCreate] presigned URL 요청 실패', ax.response?.status, ax.response?.data, apiErr)
              throw apiErr
            }
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': contentType },
            })
            console.log('[PostCreate] S3 PUT 응답', putRes.status, putRes.ok)
            if (!putRes.ok) {
              throw new Error(await buildUploadFailureMessage(putRes))
            }
            added.push({ key, previewUrl: URL.createObjectURL(file) })
          }
          console.log('[PostCreate] 업로드 완료, 미리보기 추가 개수:', added.length)
          setImageItems((prev) => {
            const next = [...prev, ...added]
            return next.slice(0, MAX_IMAGES)
          })
        } catch (error) {
          console.error('PostCreate image upload failed', error)
          const message = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.'
          showToast(message)
        } finally {
          setImageUploading(false)
        }
      }
      run().catch((err) => {
        console.error('PostCreate image add unhandled', err)
        showToast('이미지 추가 중 오류가 발생했습니다.')
        setImageUploading(false)
      })
    }
    setTimeout(readAndUpload, 0)
  }, [])

  const handleImageRemove = useCallback((index: number) => {
    setImageItems((prev) => {
      const next = [...prev]
      const removed = next[index]
      URL.revokeObjectURL(removed.previewUrl)
      next.splice(index, 1)
      if (removed.key) {
        deletePostImageByKey(removed.key).catch(() => {})
      }
      return next
    })
  }, [])

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
      imageKeys: imageItems.map((item) => item.key),
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
          <label>이미지 (최대 {MAX_IMAGES}장)</label>
          <p className="helper-text">jpg, png, webp 형식. 선택 시 바로 업로드됩니다.</p>
          <div className="post-create-images">
            {imageItems.map((item, index) => (
              <figure key={item.key} className="post-create-image-item">
                <img src={item.previewUrl} alt="" />
                <button
                  type="button"
                  className="post-create-image-remove"
                  onClick={() => handleImageRemove(index)}
                  aria-label="이미지 제거"
                >
                  ×
                </button>
              </figure>
            ))}
            {imageItems.length < MAX_IMAGES && (
              <>
                <label className="post-create-image-add">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={imageUploading}
                    onChange={handleImageAdd}
                  />
                  <span className="secondary-btn small">
                    {imageUploading ? '업로드 중…' : '+ 이미지 추가'}
                  </span>
                </label>
              </>
            )}
          </div>
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
