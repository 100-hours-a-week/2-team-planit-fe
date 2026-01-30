import { useEffect, useState } from 'react'
import { getPosts } from '../api/posts'
import type { PostListItem } from '../api/posts'

export default function PostListPage() {
  const [posts, setPosts] = useState<PostListItem[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    let isMounted = true

    getPosts()
      .then((response) => {
        if (isMounted) {
          setPosts(response.posts)
          setHasMore(response.hasMore)
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('게시물을 불러오는 데 실패했습니다.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main>
      <h1>PostListPage</h1>
      {isLoading && <p>로딩 중…</p>}
      {!isLoading && error && <p>{error}</p>}
      {!isLoading && !error && (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      )}
      {!isLoading && !error && posts.length === 0 && (
        <p>게시글이 없습니다.</p>
      )}
      {!isLoading && !error && hasMore && (
        <p>추가 게시물이 더 있습니다.</p>
      )}
    </main>
  )
}
