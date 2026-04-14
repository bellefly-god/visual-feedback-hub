import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCard } from "@/components/feedback/ProjectCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { routePaths } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { ProjectListItem } from "@/types/feedback";

const filters = ["All", "Pending", "Fixed", "Approved"] as const;
const ITEMS_PER_PAGE = 6;

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const nextProjects = await feedbackGateway.listProjects();

        if (!isMounted) {
          return;
        }

        setProjects(nextProjects);
      } catch (error) {
        console.error("Failed to load projects:", error);
        if (isMounted) {
          setProjects([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const filtered = useMemo(() => {
    if (activeFilter === "All") {
      return projects;
    }

    return projects.filter((project) => project.status === activeFilter.toLowerCase());
  }, [activeFilter, projects]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Projects</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""} total
            </p>
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

        {isLoading ? (
          <div className="mt-16 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : paginatedProjects.length > 0 ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and adjacent pages
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    // Show ellipsis for gaps
                    const showEllipsisBefore =
                      page === 2 && currentPage > 4;
                    const showEllipsisAfter =
                      page === totalPages - 1 && currentPage < totalPages - 3;

                    if (showEllipsisBefore) {
                      return (
                        <span key="ellipsis-before" className="px-1 text-muted-foreground">
                          ...
                        </span>
                      );
                    }

                    if (showEllipsisAfter) {
                      return (
                        <span key="ellipsis-after" className="px-1 text-muted-foreground">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) {
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-8 min-w-[32px] rounded-lg px-2 text-[13px] font-medium transition-colors",
                          currentPage === page
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-24 text-center">
            <p className="text-[14px] font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {activeFilter === "All"
                ? "Create a new project to get started."
                : `No projects with "${activeFilter}" status.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
