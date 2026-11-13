import { Toaster as Sonner } from "sonner"

export function Toaster(props) {
  return <Sonner dir="rtl" position="top-center" richColors closeButton {...props} />
}
