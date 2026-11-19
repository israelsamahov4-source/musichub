import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-xl bg-[hsl(228_22%_92%)]", className)}
      {...props} />)
  );
}

export { Skeleton }
