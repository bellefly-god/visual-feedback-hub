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
    <Link to="/editor" className="group glass-card-hover block p-5">
      <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{project.date}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        <span>{project.commentCount} comments</span>
      </div>
    </Link>
  );
}
