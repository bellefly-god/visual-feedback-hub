import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCard } from "@/components/feedback/ProjectCard";
import { mockProjects } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const filters = ["All", "Pending", "Fixed", "Approved"] as const;

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filtered = activeFilter === "All"
    ? mockProjects
    : mockProjects.filter((p) => p.status === activeFilter.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Your Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage and track all your feedback projects.</p>
          </div>
          <Button asChild>
            <Link to="/upload">
              <Plus className="mr-1.5 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground">No projects found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different filter or create a new project.</p>
          </div>
        )}
      </div>
    </div>
  );
}
