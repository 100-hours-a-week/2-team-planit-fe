import test from 'node:test'
import assert from 'node:assert/strict'
import { isImeComposing, isSubmitEnter } from '../src/utils/chatInputGuards.ts'

test('composing 중 Enter(keyCode 229)는 전송하면 안 된다', () => {
  assert.equal(isImeComposing({ isComposing: true }), true)
  assert.equal(isImeComposing({ keyCode: 229 }), true)
})

test('조합 종료 후 Enter는 전송 조건을 만족한다', () => {
  assert.equal(isImeComposing({ isComposing: false, keyCode: 13 }), false)
  assert.equal(isSubmitEnter('Enter', false), true)
})

test('Shift+Enter는 줄바꿈으로 처리되어 전송하지 않는다', () => {
  assert.equal(isSubmitEnter('Enter', true), false)
})
