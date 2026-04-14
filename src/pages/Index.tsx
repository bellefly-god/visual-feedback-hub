import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { DEMO_PROJECT_ID, routePaths } from "@/lib/routePaths";
import { useEffect, useState } from "react";
import { feedbackGateway } from "@/services/feedbackGateway";

const fade = (delay: number) => ({
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { delay, duration: 0.5, ease: "easeOut" } },
});

const values = [
  { title: "Annotate visually", desc: "Pin comments and draw directly on your designs." },
  { title: "Share one link", desc: "No login needed. Clients open and review instantly." },
  { title: "Collect feedback", desc: "All replies threaded in one clean view." },
];

const steps = [
  { num: "1", title: "Upload", desc: "Drop a screenshot, image, or PDF." },
  { num: "2", title: "Annotate", desc: "Add pins, arrows, and notes." },
  { num: "3", title: "Share", desc: "Send a clean review link." },
  { num: "4", title: "Collect", desc: "Clients reply and approve." },
];

// Demo preview components
function DemoPin({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.3, type: "spring" }}
    >
      <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
        {delay}
      </div>
    </motion.div>
  );
}

function DemoPreviewContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay to ensure animation plays after visible
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-muted/30">
      {/* Simulated screenshot/image */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30" />

      {/* Simulated UI elements */}
      <div className="absolute left-4 right-4 top-4 h-8 rounded-lg bg-card/80 shadow-sm" />
      <div className="absolute left-4 top-16 h-32 w-1/2 rounded-lg bg-card/60 shadow-sm" />
      <div className="absolute right-4 top-16 h-48 w-1/3 rounded-lg bg-card/60 shadow-sm" />
      <div className="absolute left-4 top-52 h-24 w-full rounded-lg bg-card/60 shadow-sm" />

      {/* Demo pins with annotations */}
      <DemoPin delay={0.5} x={20} y={30} />
      <DemoPin delay={0.7} x={60} y={45} />
      <DemoPin delay={0.9} x={35} y={70} />

      {/* Floating comment preview */}
      <motion.div
        className="absolute left-[55%] top-[25%] max-w-[180px] rounded-lg border border-border/60 bg-card p-3 shadow-lg"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.3 }}
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/20 text-[10px] font-bold text-primary">
            1
          </div>
          <span className="text-[11px] font-medium text-foreground">Sarah Chen</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The hero headline feels too small on desktop.
        </p>
      </motion.div>

      {/* Annotation cursor */}
      <motion.div
        className="absolute bottom-8 right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.3 }}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm">
          <Eye className="h-3 w-3" />
          Live preview
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const projects = await feedbackGateway.listProjects();
        setRecentProjects(projects.slice(0, 3));
      } catch (error) {
        console.error("Failed to load recent projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecent();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-32">
        <motion.p
          className="text-[13px] font-medium text-primary"
          variants={fade(0)}
          initial="hidden"
          animate="visible"
        >
          Visual feedback for teams
        </motion.p>
        <motion.h1
          className="mt-4 font-display text-[2.75rem] font-bold leading-[1.08] text-foreground sm:text-[3.5rem]"
          variants={fade(0.08)}
          initial="hidden"
          animate="visible"
        >
          Visual feedback without the email chaos.
        </motion.h1>
        <motion.p
          className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground"
          variants={fade(0.16)}
          initial="hidden"
          animate="visible"
        >
          Upload screenshots, images, or PDFs — annotate directly, and share one clean review link.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          variants={fade(0.24)}
          initial="hidden"
          animate="visible"
        >
          <Button size="lg" className="h-11 rounded-xl px-6 text-[14px]" asChild>
            <Link to={routePaths.upload}>
              Start a Feedback Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="h-11 rounded-xl px-6 text-[14px] text-muted-foreground" asChild>
            <Link to={routePaths.editor(DEMO_PROJECT_ID)}>
              <Eye className="mr-2 h-4 w-4" />
              See Demo
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Preview */}
      <section className="mx-auto max-w-4xl px-6">
        <motion.div
          className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-[360px] bg-gradient-to-br from-muted/60 to-background sm:h-[440px]">
            <DemoPreviewContent />
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-3xl px-6 py-28">
        <div className="grid gap-12 sm:grid-cols-3">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <h3 className="font-display text-[15px] font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-3xl px-6 pb-28">
        <h2 className="mb-12 text-center font-display text-xl font-semibold text-foreground">How it works</h2>
        <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <span className="text-[13px] font-semibold text-primary">{s.num}</span>
              <h3 className="mt-1 font-display text-[14px] font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Projects (if any) */}
      {recentProjects.length > 0 && !isLoading && (
        <section className="mx-auto max-w-3xl px-6 pb-28">
          <h2 className="mb-8 text-center font-display text-xl font-semibold text-foreground">
            Recent Projects
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {recentProjects.map((project, i) => (
              <motion.div
                key={project.id}
                className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link
                  to={routePaths.editor(project.id)}
                  className="block"
                >
                  <h4 className="truncate text-[14px] font-medium text-foreground">{project.name}</h4>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {project.commentCount} comment{project.commentCount !== 1 ? "s" : ""} • {project.date}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">Ready to simplify your feedback?</h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] text-muted-foreground">
            Start your first project in under a minute. Free to try.
          </p>
          <Button size="lg" className="mt-6 h-11 rounded-xl px-6 text-[14px]" asChild>
            <Link to={routePaths.upload}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center">
          <p className="text-xs text-muted-foreground/60">© 2026 FeedbackMark</p>
        </div>
      </footer>
    </div>
  );
}
