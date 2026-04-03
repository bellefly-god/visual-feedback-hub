import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Pending", className: "text-warning" },
  fixed: { label: "Fixed", className: "text-primary" },
  approved: { label: "Approved", className: "text-success" },
};

interface StatusBadgeProps {
  status: "pending" | "fixed" | "approved";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("text-[11px] font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
