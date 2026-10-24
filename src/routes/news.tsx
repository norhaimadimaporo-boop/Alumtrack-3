import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, ArrowRight, X } from "lucide-react";
import { POSTS, type Post } from "@/data/news";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Events — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "Announcements, events, and job postings from the MSU Office of Alumni Relations and Career Center.",
      },
      { property: "og:title", content: "News & Events — AlumTrack" },
      {
        property: "og:description",
        content: "Latest announcements, alumni events, and job postings from OARCC.",
      },
    ],
  }),
  component: NewsPage,
});

const TABS = ["All", "News", "Event", "Job"] as const;

function NewsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [open, setOpen] = useState<Post | null>(null);

  const featured = POSTS.find((p) => p.featured)!;
  const rest = POSTS.filter((p) => !p.featured).filter(
    (p) => tab === "All" || p.category === tab,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="border-l-4 border-brand pl-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">News &amp; Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Posted by the Office of Alumni Relations and Career Center.
        </p>
      </div>

      <button
        onClick={() => setOpen(featured)}
        className="mt-8 grid w-full overflow-hidden rounded-sm border border-border bg-card text-left transition-colors hover:border-brand md:grid-cols-[1.1fr_1fr]"
      >
        <div className="relative flex min-h-56 items-end bg-brand p-8">
          {featured.photo && (
            <img
              src={featured.photo}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <span className="relative rounded-sm bg-highlight px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-highlight-foreground">
            Featured {featured.category}
          </span>
        </div>
        <div className="p-8">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {featured.date}
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-foreground">
            {featured.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {featured.excerpt}
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            Read more <ArrowRight className="size-4" />
          </span>
        </div>
      </button>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {t === "All" ? "All Posts" : t === "News" ? "News" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <button
            key={post.id}
            onClick={() => setOpen(post)}
            className="group flex flex-col overflow-hidden rounded-sm border border-border bg-card text-left transition-colors hover:border-brand"
          >
            {post.photo ? (
              <img
                src={post.photo}
                alt=""
                loading="lazy"
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="h-32 bg-secondary" />
            )}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2">
                <CategoryTag category={post.category} />
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h3 className="mt-3 text-base font-bold leading-snug text-foreground group-hover:text-brand">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                Read more <ArrowRight className="size-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-sm border-t-4 border-brand bg-card p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <CategoryTag category={open.category} />
              <button onClick={() => setOpen(null)} aria-label="Close">
                <X className="size-5 text-muted-foreground hover:text-brand" />
              </button>
            </div>
            {open.photo && (
              <img
                src={open.photo}
                alt=""
                loading="lazy"
                className="mt-4 w-full rounded-lg object-cover"
              />
            )}
            <p className="mt-4 text-xs text-muted-foreground">{open.date}</p>
            <h2 className="mt-1 text-2xl font-bold leading-snug text-foreground">
              {open.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">{open.excerpt}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{open.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTag({ category }: { category: Post["category"] }) {
  const styles =
    category === "Event"
      ? "bg-highlight/30 text-highlight-foreground"
      : category === "Job"
        ? "bg-success/12 text-success"
        : "bg-brand/10 text-brand";
  return (
    <span
      className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${styles}`}
    >
      {category}
    </span>
  );
}