import { defineStore } from "pinia"
import { ref } from "vue"

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export const useConfirmStore = defineStore("confirm", () => {
  const options = ref<ConfirmOptions | null>(null)
  let resolveFn: ((val: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    return new Promise<boolean>((resolve) => {
      resolveFn = resolve
    })
  }

  function handleConfirm() {
    resolveFn?.(true)
    resolveFn = null
    options.value = null
  }

  function handleCancel() {
    resolveFn?.(false)
    resolveFn = null
    options.value = null
  }

  return { options, confirm, handleConfirm, handleCancel }
})

/** Convenience: returns the confirm() function, mirroring the old useConfirm() API. */
export function useConfirm() {
  return useConfirmStore().confirm
}
