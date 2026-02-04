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

export async function createPost(payload: CreatePostPayload): Promise<PostCreateResponse> {
  const response = await api.post<PostCreateResponse>(BASE_PATH, payload)
  return response.data
}

export async function createPostForm(form: FormData): Promise<PostCreateResponse> {
  const response = await api.post<PostCreateResponse>(BASE_PATH, form)
  return response.data
}

export async function updatePost(id: string, payload: UpdatePostPayload): Promise<PostCreateResponse> {
  const response = await api.patch<PostCreateResponse>(`${BASE_PATH}/${id}`, payload)
  return response.data
}

export async function updatePostForm(id: number, form: FormData): Promise<PostCreateResponse> {
  const response = await api.patch<PostCreateResponse>(`${BASE_PATH}/${id}`, form)
  return response.data
}

export async function deletePost(id: number | string): Promise<void> {
  await api.delete(`${BASE_PATH}/${id}`)
}
