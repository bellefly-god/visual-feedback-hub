import { FileImage, FileText, Monitor, MessageSquare } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Project } from "@/data/mockData";
import { Link } from "react-router-dom";

const fileIcons = {
  image: FileImage,
  pdf: FileText,
  screenshot: Monitor,
};

export function ProjectCard({ project }: { project: Project }) {
  const Icon = fileIcons[project.fileType];

  return (
    <Link
      to="/editor"
      className="group block rounded-xl border border-border/60 bg-card p-5 transition-all duration-200 hover:border-border"
    >
      <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-muted/40">
        <Icon className="h-8 w-8 text-muted-foreground/30" />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="truncate text-[13px] font-medium text-foreground">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted-foreground/70">
        <span>{project.date}</span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {project.commentCount}
        </span>
      </div>
    </Link>
  );
}
