import { FileImage, FileText, Monitor, MessageSquare } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { ProjectListItem } from "@/types/feedback";
import { Link } from "react-router-dom";
import { routePaths } from "@/lib/routePaths";
import { useState } from "react";

const fileIcons = {
  image: FileImage,
  pdf: FileText,
  screenshot: Monitor,
};

interface ProjectCardProps {
  project: ProjectListItem;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const Icon = fileIcons[project.fileType];
  const [imageError, setImageError] = useState(false);

  // Determine the thumbnail URL
  // Priority: thumbnail > assetUrl (for image type)
  const thumbnailUrl = project.thumbnail || (project.fileType === "image" ? project.thumbnail : null);

  const showImagePreview = thumbnailUrl && !imageError;

  return (
    <Link
      to={routePaths.editor(project.id)}
      className="group block rounded-xl border border-border/60 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm"
    >
      {/* Thumbnail / Preview Area */}
      <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
        {showImagePreview ? (
          <img
            src={thumbnailUrl}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground/30" />
        )}
      </div>

      {/* Project Info */}
      <div className="flex items-center justify-between">
        <h3
          className="truncate text-[13px] font-medium text-foreground"
          title={project.name}
        >
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Metadata */}
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
