import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Share2, Inbox, MousePointer2, Upload, Eye, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const values = [
  { icon: MousePointer2, title: "Annotate visually", desc: "Pin comments, draw arrows, and highlight areas directly on your design." },
  { icon: Share2, title: "Share instantly", desc: "Generate one clean review link. No login required for reviewers." },
  { icon: Inbox, title: "Collect replies in one place", desc: "All feedback threaded and organized. No more email chaos." },
];

const steps = [
  { num: "01", icon: Upload, title: "Upload your design", desc: "Drop a screenshot, image, or PDF into FeedbackMark." },
  { num: "02", icon: MousePointer2, title: "Add annotations", desc: "Pin comments, draw highlights, and leave notes." },
  { num: "03", icon: Share2, title: "Share the link", desc: "Send a clean review link to your client or team." },
  { num: "04", icon: CheckCircle2, title: "Collect feedback", desc: "Clients reply, approve, or request changes — all in one place." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <MessageCircle className="h-3 w-3" />
            Simple visual feedback for teams
          </span>
        </motion.div>
        <motion.h1
          className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          variants={fadeUp} custom={1} initial="hidden" animate="visible"
        >
          Visual feedback without the email chaos.
        </motion.h1>
        <motion.p
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          variants={fadeUp} custom={2} initial="hidden" animate="visible"
        >
          Upload screenshots, images, or PDFs — annotate directly, and share one clean review link.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          variants={fadeUp} custom={3} initial="hidden" animate="visible"
        >
          <Button size="lg" asChild>
            <Link to="/upload">
              Start a Feedback Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/editor">
              <Eye className="mr-2 h-4 w-4" />
              See Demo
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* Product Preview */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          className="glass-card overflow-hidden p-1.5"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex h-[340px] items-center justify-center rounded-lg bg-gradient-to-br from-primary/5 via-muted to-primary/[0.03] sm:h-[420px]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MousePointer2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Annotation editor preview</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Value Props */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <v.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">Four simple steps to better feedback.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary">{s.num}</span>
              <h3 className="mt-1 font-display text-sm font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Ready to simplify your feedback?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Start your first feedback project in under a minute. Free to try, no account needed.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/upload">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center sm:px-6">
          <p className="text-xs text-muted-foreground">© 2026 FeedbackMark. Built for better feedback loops.</p>
        </div>
      </footer>
    </div>
  );
}
