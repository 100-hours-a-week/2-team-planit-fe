import api from './axios'

export interface PostListItem {
  id: string
  title: string
}

export interface PostDetail {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
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

export async function getPosts(): Promise<PostListResponse> {
  const response = await api.get<PostListResponse>(BASE_PATH)
  return response.data
}

export async function getPost(id: string): Promise<PostDetail> {
  const response = await api.get<PostDetail>(`${BASE_PATH}/${id}`)
  return response.data
}

export async function createPost(payload: CreatePostPayload): Promise<PostDetail> {
  const response = await api.post<PostDetail>(BASE_PATH, payload)
  return response.data
}

export async function updatePost(id: string, payload: UpdatePostPayload): Promise<PostDetail> {
  const response = await api.patch<PostDetail>(`${BASE_PATH}/${id}`, payload)
  return response.data
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`${BASE_PATH}/${id}`)
}
