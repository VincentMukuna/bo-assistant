import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const active = status === "In progress";
  const approval =
    status === "Pending" || status === "Needs approval" || status === "Approval needed";
  const completed = status === "Completed";

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-primary/10 bg-primary/10 text-primary h-5 rounded-md px-2 font-mono text-[10px] font-medium tracking-[0.02em] shadow-none",
        approval && "border-amber-600/10 bg-amber-600/10 text-amber-700",
        active && "border-violet-600/10 bg-violet-600/10 text-violet-700",
        completed && "border-zinc-200 bg-zinc-100 text-zinc-500"
      )}
    >
      {status}
    </Badge>
  );
}
