import api from './axios'

export type SortParam = 'latest' | 'comment' | 'like'

export interface PostListItem {
  postId: number
  title: string
  authorId: number
  authorNickname: string
  authorProfileImageUrl?: string | null
  createdAt: string
  likeCount: number
  commentCount: number
  representativeImageId?: number | null
  rankingScore?: number | null
  placeName?: string | null
  tripTitle?: string | null
}

export interface PostDetail {
  postId: number
  boardName: string
  boardDescription: string
  title: string
  content: string
  createdAt: string
  author: {
    authorId: number
    nickname: string
    profileImageUrl?: string | null
  }
  images: {
    imageId: number
    /** S3 key (수정 시 기존 이미지 유지용) */
    key?: string
    url?: string
  }[]
  likeCount: number
  commentCount: number
  likedByRequester: boolean
  comments: {
    commentId: number
    authorId: number
    authorNickname: string
    authorProfileImageUrl?: string | null
    content: string
    createdAt: string
    deletable: boolean
  }[]
  editable: boolean
}

export interface CommentItem {
  commentId: number
  authorId: number
  authorNickname: string
  authorProfileImageUrl?: string | null
  content: string
  createdAt: string
  deletable: boolean
}

export interface CommentPageResponse {
  comments: CommentItem[]
  hasMore: boolean
}

export interface CreateCommentPayload {
  content: string
}

export interface CreatePostPayload {
  title: string
  content: string
}

export interface UpdatePostPayload {
  title?: string
  content?: string
}

const BASE_PATH = '/posts'

export interface PostListResponse {
  posts: PostListItem[]
  hasMore: boolean
}

export interface GetPostsParams {
  boardType?: string
  search?: string
  sort?: SortParam
  page?: number
  size?: number
}

export async function getPosts(params?: GetPostsParams): Promise<PostListResponse> {
  const response = await api.get<PostListResponse>(BASE_PATH, {
    params,
  })
  return response.data
}

export async function getPost(id: string): Promise<PostDetail> {
  const response = await api.get<PostDetail>(`${BASE_PATH}/${id}`)
  return response.data
}

export async function getPostComments(
  postId: number,
  params?: { page?: number; size?: number },
): Promise<CommentPageResponse> {
  const response = await api.get<CommentPageResponse>(`${BASE_PATH}/${postId}/comments`, {
    params,
  })
  return response.data
}

export async function createComment(
  postId: number,
  payload: CreateCommentPayload,
): Promise<CommentItem> {
  const response = await api.post<CommentItem>(`${BASE_PATH}/${postId}/comments`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return response.data
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  await api.delete(`${BASE_PATH}/${postId}/comments/${commentId}`)
}

export async function likePost(postId: number): Promise<void> {
  await api.post(`${BASE_PATH}/${postId}/likes`)
}

export async function unlikePost(postId: number): Promise<void> {
  await api.delete(`${BASE_PATH}/${postId}/likes`)
}

export interface PostCreateResponse {
  postId: number
  boardType: string
  title: string
  content: string
  createdAt: string
  userId: number
  imageIds: number[]
}

export async function createPost(payload: CreatePostPayload & { imageKeys?: string[] }): Promise<PostCreateResponse> {
  const response = await api.post<PostCreateResponse>(BASE_PATH, payload)
  return response.data
}

export async function updatePost(
  id: string | number,
  payload: UpdatePostPayload & { imageKeys?: string[] },
): Promise<PostCreateResponse> {
  const response = await api.patch<PostCreateResponse>(`${BASE_PATH}/${id}`, payload)
  return response.data
}

export async function deletePost(id: number | string): Promise<void> {
  await api.delete(`${BASE_PATH}/${id}`)
}

export interface PresignedUrlResponse {
  /** S3로 PUT할 presigned URL */
  uploadUrl: string
  key: string
  expiresAt: string
}

/** 게시물 이미지 Presigned URL 발급 (확장자: jpg, jpeg, png, webp) */
export async function getPostPresignedUrl(
  fileExtension: string,
  contentType?: string,
): Promise<PresignedUrlResponse> {
  const response = await api.post<PresignedUrlResponse>(
    `${BASE_PATH}/images/presigned-url`,
    { fileExtension, contentType: contentType ?? 'image/jpeg' },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
  )
  return response.data
}

/** 게시물 이미지 단건 삭제 (수정 화면에서 개별 삭제 시 사용, DB+S3) */
export async function deletePostImage(postId: number, imageId: number): Promise<void> {
  await api.delete(`${BASE_PATH}/${postId}/images/${imageId}`)
}

/** 업로드만 하고 저장하지 않은 이미지 S3 삭제 (작성/수정 중 이미지 제거 시 호출) */
export async function deletePostImageByKey(key: string): Promise<void> {
  await api.delete(`${BASE_PATH}/images/by-key`, { params: { key } })
}
