import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveSenderDisplayName,
  resolveSenderProfileImageUrl,
} from '../src/utils/chatPresentation.ts'

test('senderNickname이 있으면 작성자명으로 우선 표시한다', () => {
  const message = {
    content: 'hello',
    senderUserId: 7,
    senderNickname: '닉네임A',
  }
  const nicknameCache = { 7: '캐시닉네임' }
  assert.equal(resolveSenderDisplayName(message, nicknameCache), '닉네임A')
})

test('senderNickname이 없으면 senderUserId 캐시 fallback을 사용한다', () => {
  const message = {
    content: 'hello',
    senderUserId: 8,
  }
  const nicknameCache = { 8: '캐시닉네임B' }
  assert.equal(resolveSenderDisplayName(message, nicknameCache), '캐시닉네임B')
})

test('senderNickname과 fallback이 모두 없으면 알 수 없음으로 표시한다', () => {
  const message = {
    content: 'hello',
  }
  const nicknameCache = {}
  assert.equal(resolveSenderDisplayName(message, nicknameCache), '알 수 없음')
})

test('senderProfileImageUrl 우선순위가 캐시보다 높다', () => {
  const message = {
    content: 'hello',
    senderUserId: 9,
    senderProfileImageUrl: 'https://cdn.example.com/me.png',
  }
  const profileCache = { 9: 'https://cdn.example.com/cache.png' }
  assert.equal(resolveSenderProfileImageUrl(message, profileCache), 'https://cdn.example.com/me.png')
})
