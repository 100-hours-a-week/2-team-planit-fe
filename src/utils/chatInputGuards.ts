export type KeyboardNativeLike = {
  isComposing?: boolean
  keyCode?: number
}

export const isImeComposing = (nativeEvent: KeyboardNativeLike) =>
  nativeEvent.isComposing === true || nativeEvent.keyCode === 229

export const isSubmitEnter = (key: string, shiftKey: boolean) => key === 'Enter' && !shiftKey
