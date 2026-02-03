export type ToastPayload = {
  message: string
  key: number
}

export const createToastInfo = (message: string): ToastPayload => ({
  message,
  key: Date.now(),
})
