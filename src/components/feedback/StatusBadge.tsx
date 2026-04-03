import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  fixed: { label: "Fixed", className: "bg-primary/10 text-primary border-primary/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
};

interface StatusBadgeProps {
  status: "pending" | "fixed" | "approved";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
