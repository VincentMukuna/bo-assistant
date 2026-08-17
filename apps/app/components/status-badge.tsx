import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const active = status === "In progress";
  const approval = status === "Needs approval" || status === "Approval needed";

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-full border-zinc-200 bg-white px-2 font-normal text-zinc-600 shadow-none",
        approval && "border-zinc-400 text-zinc-900",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-zinc-400",
          active && "bg-zinc-950",
          approval && "bg-white ring-1 ring-zinc-950",
          status === "Completed" && "bg-zinc-300",
        )}
      />
      {status}
    </Badge>
  );
}
