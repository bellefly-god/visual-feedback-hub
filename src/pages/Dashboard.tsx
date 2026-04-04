import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCard } from "@/components/feedback/ProjectCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { routePaths } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { ProjectListItem } from "@/types/feedback";

const filters = ["All", "Pending", "Fixed", "Approved"] as const;

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const nextProjects = await feedbackGateway.listProjects();

      if (!isMounted) {
        return;
      }

      setProjects(nextProjects);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === "All") {
      return projects;
    }

    return projects.filter((project) => project.status === activeFilter.toLowerCase());
  }, [activeFilter, projects]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Projects</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Your feedback projects.</p>
          </div>
          <Button size="sm" className="h-8 rounded-lg text-[13px]" asChild>
            <Link to={routePaths.upload}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Project
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                activeFilter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-24 text-center">
            <p className="text-[14px] font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Try a different filter or create a new project.</p>
          </div>
        )}
      </div>
    </div>
  );
}
