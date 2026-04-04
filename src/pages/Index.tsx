import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { DEMO_PROJECT_ID, routePaths } from "@/lib/routePaths";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-32">
        <motion.p
          className="text-[13px] font-medium text-primary"
          variants={fade(0)} initial="hidden" animate="visible"
        >
          Visual feedback for teams
        </motion.p>
        <motion.h1
          className="mt-4 font-display text-[2.75rem] font-bold leading-[1.08] text-foreground sm:text-[3.5rem]"
          variants={fade(0.08)} initial="hidden" animate="visible"
        >
          Visual feedback without the email chaos.
        </motion.h1>
        <motion.p
          className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground"
          variants={fade(0.16)} initial="hidden" animate="visible"
        >
          Upload screenshots, images, or PDFs — annotate directly, and share one clean review link.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          variants={fade(0.24)} initial="hidden" animate="visible"
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
          className="overflow-hidden rounded-2xl border border-border/60 bg-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex h-[360px] items-center justify-center bg-gradient-to-br from-muted/60 to-background sm:h-[440px]">
            <p className="text-sm text-muted-foreground/40">Annotation editor preview</p>
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
