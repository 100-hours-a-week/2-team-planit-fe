import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { deletePostImageByKey, getPost, getPostPresignedUrl, updatePost } from '../api/posts'
import type { PostDetail } from '../api/posts'
import { useAuth } from '../store'

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

type ImageItem = { key: string; previewUrl?: string; url?: string }

export default function PostEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [detail, setDetail] = useState<PostDetail | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageItems, setImageItems] = useState<ImageItem[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})
  const [toastInfo, setToastInfo] = useState<{ message: string; key: number } | null>(null)

  const isAuthor = Boolean(detail && user && detail.author.authorId === user.id)

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
        const initialImages: ImageItem[] = (response.images ?? [])
          .filter((img): img is typeof img & { key: string } => Boolean(img.key))
          .map((img) => ({ key: img.key, url: img.url }))
        setImageItems(initialImages)
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
    return () => {
      imageItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [imageItems])

  const imageCountRef = useRef(0)
  imageCountRef.current = imageItems.length

  const handleImageAdd = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const readAndUpload = () => {
      const files = input.files
      const currentCount = imageCountRef.current
      const slot = MAX_IMAGES - currentCount
      console.log('[PostEdit] 이미지 선택됨', files?.length ?? 0, '개, 현재 이미지:', currentCount, '남은 슬롯:', slot)
      if (!files?.length) return
      if (slot <= 0) {
        showToast('이미지는 최대 5장까지 추가할 수 있습니다.')
        return
      }
      const fileList = Array.from(files).slice(0, slot)
      input.value = ''
      setImageUploading(true)
      const run = async () => {
        try {
          const added: ImageItem[] = []
          const toAdd = fileList
          for (const file of toAdd) {
            const fileExtension = getFileExtension(file)
            const contentType = file.type || 'image/jpeg'
            console.log('[PostEdit] presigned URL 요청 중...', { fileExtension, contentType })
            let uploadUrl: string
            let key: string
            try {
              const res = await getPostPresignedUrl(fileExtension, contentType)
              uploadUrl = res.uploadUrl
              key = res.key
              console.log('[PostEdit] presigned URL 받음, S3 PUT 시도 중...')
            } catch (apiErr: unknown) {
              const ax = apiErr as { response?: { status?: number; data?: unknown } }
              console.error('[PostEdit] presigned URL 요청 실패', ax.response?.status, ax.response?.data, apiErr)
              throw apiErr
            }
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': contentType },
            })
            console.log('[PostEdit] S3 PUT 응답', putRes.status, putRes.ok)
            if (!putRes.ok) {
              throw new Error(await buildUploadFailureMessage(putRes))
            }
            added.push({ key, previewUrl: URL.createObjectURL(file) })
          }
          console.log('[PostEdit] 업로드 완료, 미리보기 추가 개수:', added.length)
          setImageItems((prev) => [...prev, ...added].slice(0, MAX_IMAGES))
        } catch (error) {
          console.error('PostEdit image upload failed', error)
          const message = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.'
          showToast(message)
        } finally {
          setImageUploading(false)
        }
      }
      run().catch((err) => {
        console.error('PostEdit image add unhandled', err)
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
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      next.splice(index, 1)
      if (removed.key && removed.previewUrl) {
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
    const payload = {
      boardType: 'FREE',
      title: title.trim(),
      content: content.trim(),
      imageKeys: imageItems.map((item) => item.key),
    }
    setIsSubmitting(true)
    try {
      const result = await updatePost(detail.postId, payload)
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
            <label>이미지 (최대 {MAX_IMAGES}장)</label>
            <p className="helper-text">기존 이미지 유지, 추가 또는 제거할 수 있습니다.</p>
            <div className="post-create-images">
              {imageItems.map((item, index) => (
                <figure key={`${item.key}-${index}`} className="post-create-image-item">
                  <img
                    src={item.previewUrl ?? item.url ?? ''}
                    alt=""
                  />
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
              )}
            </div>
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
