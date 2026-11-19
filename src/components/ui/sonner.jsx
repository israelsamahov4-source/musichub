import { Toaster as Sonner } from "sonner"
import { DIR } from "@/lib/i18n"

export function Toaster(props) {
  return <Sonner dir={DIR} position="top-center" richColors closeButton {...props} />
}
