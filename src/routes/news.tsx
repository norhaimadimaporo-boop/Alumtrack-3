import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, ArrowRight, X } from "lucide-react";
import { POSTS, findPostPhoto, type Post } from "@/data/news";
import { getPostViewer, getPublishedPosts } from "@/lib/posts.functions";
import { postExcerpt, type PostRecord } from "@/lib/posts.types";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Latest Posts — AlumTrack MSU Main Campus" },
      {
        name: "description",
        content:
          "News, events, and job postings from the MSU Office of Alumni Relations and Career Center.",
      },
      { property: "og:title", content: "Latest Posts — AlumTrack" },
      {
        property: "og:description",
        content: "Latest announcements, alumni events, and job postings from OARCC.",
      },
    ],
  }),
  loader: async () => {
    const [result, viewer] = await Promise.all([getPublishedPosts(), getPostViewer()]);
    return { posts: result.ok ? result.posts : [], canSeeJobs: viewer.canSeeJobs };
  },
  component: NewsPage,
});

const TABS = [
  { value: "All", label: "All Posts" },
  { value: "News", label: "News" },
  { value: "Event", label: "Events" },
  { value: "Job", label: "Jobs" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

type FeedPost = Post & { images: string[] };

function toFeedPost(post: PostRecord): FeedPost {
  const excerpt = postExcerpt(post.content);
  const photo = post.images[0] ?? findPostPhoto(post.title);
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    date: post.date,
    excerpt,
    body: post.content,
    featured: post.featured,
    images: post.images,
    ...(photo ? { photo } : {}),
  };
}

function NewsPage() {
  const { posts: loaded, canSeeJobs } = Route.useLoaderData();
  const [tab, setTab] = useState<TabValue>("All");
  const [open, setOpen] = useState<FeedPost | null>(null);

  const visibleTabs = canSeeJobs ? TABS : TABS.filter((t) => t.value !== "Job");

  const posts: FeedPost[] = (
    loaded.length > 0
      ? loaded.map(toFeedPost)
      : POSTS.map((post) => ({ ...post, images: post.photo ? [post.photo] : [] }))
  ).filter((post) => canSeeJobs || post.category !== "Job");

  const featuredPosts = posts.filter((post) => post.featured);
  const listed = posts.filter((post) => tab === "All" || post.category === tab);
  const heading = featuredPosts.length === 1 ? "Latest Post" : "Latest Posts";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="border-l-4 border-brand pl-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Posted by the Office of Alumni Relations and Career Center.
        </p>
      </div>

      {featuredPosts.map((featured) => (
        <button
          key={featured.id}
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
      ))}

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border pb-3">
        {visibleTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid max-h-[520px] overflow-y-auto gap-4 pr-2 md:grid-cols-2 lg:grid-cols-3">
        {listed.length === 0 && (
          <p className="col-span-full rounded-sm border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No posts in this category yet.
          </p>
        )}
        {listed.map((post) => (
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
            {open.images.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {open.images.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    loading="lazy"
                    className="w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{open.date}</p>
            <h2 className="mt-1 text-2xl font-bold leading-snug text-foreground">
              {open.title}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {open.body}
            </p>
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
