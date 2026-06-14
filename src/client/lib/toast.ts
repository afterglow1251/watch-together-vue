import { toast as _toast } from "vue-sonner"

function toast(msg: string) {
  _toast.success(msg)
}

toast.error = (msg: string) => {
  _toast.error(msg)
}

export default toast
