import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  MapPinned,
  Newspaper,
  UserRoundPen,
  ArrowRight,
  CalendarDays,
  MessageCircle,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { openAlumniChat } from "@/lib/chat-widget";
const heroImage = "/assets/hero-bg.jpg";
import { POSTS, findPostPhoto } from "@/data/news";
import { getPublishedPosts } from "@/lib/posts.functions";
import { postExcerpt } from "@/lib/posts.types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlumTrack - MSU Main Campus Alumni Tracing System" },
      {
        name: "description",
        content:
          "AlumTrack is the alumni tracing system and online platform of Mindanao State University - Main Campus. Search graduates, read OARCC news, and stay connected.",
      },
      { property: "og:title", content: "AlumTrack - MSU Main Campus Alumni Platform" },
      {
        property: "og:description",
        content:
          "Search MSU Marawi alumni, follow OARCC news and events, and keep your graduate profile updated.",
      },
    ],
  }),
  loader: async () => {
    const published = await getPublishedPosts();
    return { posts: published.ok ? published.posts : [] };
  },
  component: Index,
});

const FEATURES = [
  {
    icon: Search,
    title: "Search Alumni",
    text: "Browse the public directory and filter by course, college, region, and batch year.",
    to: "/search" as const,
    action: "Open directory",
  },
  {
    icon: MapPinned,
    title: "Alumni Map",
    text: "See where MSU graduates work across the Philippines and overseas on a GIS map.",
    to: "/map" as const,
    action: "View coverage",
  },
  {
    icon: Newspaper,
    title: "Latest Posts",
    text: "Announcements, homecomings, and job postings published by the OARCC.",
    to: "/news" as const,
    action: "Read updates",
  },
  {
    icon: UserRoundPen,
    title: "Register or Update",
    text: "Alumni can create an account and keep their employment record current.",
    to: "/login" as const,
    action: "Sign in",
  },
];

function Index() {
  const { posts: storedPosts } = Route.useLoaderData();
  const navigate = useNavigate();
  const role = useSession();

  const startChat = () => {
    if (role === "alumni") {
      // The launcher only lives inside the Alumni portal, so open the chat
      // there after navigation (the flag is consumed by the widget on mount).
      openAlumniChat();
      void navigate({ to: "/dashboard" });
      return;
    }
    void navigate({ to: "/login" });
  };

  const latest =
    storedPosts.length > 0
      ? storedPosts.slice(0, 3).map((post) => ({
          id: post.id,
          title: post.title,
          date: post.date,
          excerpt: postExcerpt(post.content),
          photo: post.images[0] ?? findPostPhoto(post.title),
        }))
      : POSTS.slice(0, 3);
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-brand-dark">
        <img
          src={heroImage}
          alt="Graduates at the 62nd Pre-Commencement Exercises in the Dimaporo Gymnasium"
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#5A0012]/70 via-[#80001B]/40 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <span className="inline-block bg-highlight px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-highlight-foreground">
            Office of Alumni Relations and Career Center
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] text-background drop-shadow-md sm:text-5xl md:text-6xl">
            AlumTrack
            <span className="mt-3 block text-lg font-medium leading-snug text-background/80 sm:text-xl">
              Alumni Tracing System and Online Platform for Mindanao State University - Main Campus
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-background/70 drop-shadow-md">
            One centralized portal for tracing graduates, keeping alumni records current, and
            strengthening the bond between the University and her alumni.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-dark"
            >
              <Search className="size-4" /> Search Alumni
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-highlight px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-highlight hover:text-highlight-foreground"
            >
              Alumni Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
          What you can do here
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group flex h-full flex-col justify-between rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-6 shadow-sm transition-colors hover:border-brand"
            >
              <span className="flex size-10 items-center justify-center rounded-sm bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                {f.action} <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={startChat}
            className="group flex h-full flex-col justify-between rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-6 text-left shadow-sm transition-colors hover:border-brand"
          >
            <span className="flex size-10 items-center justify-center rounded-sm bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
              <MessageCircle className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-foreground">AI Chatbox</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Ask questions anytime and get instant replies from our AI assistant, or connect
              directly with an OARCC admin for further concerns.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
              Start chatting <ArrowRight className="size-3.5" />
            </span>
          </button>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="border-l-4 border-brand pl-4 text-2xl font-bold text-foreground">
              Latest from OARCC
            </h2>
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              View all latest posts <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latest.map((post) => (
              <Link
                key={post.id}
                to="/news"
                className="group rounded-2xl border border-[#E6DFD5] bg-gradient-to-br from-card to-background p-6 shadow-sm transition-colors hover:border-brand"
              >
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {post.date}
                </p>
                <h3 className="mt-3 text-base font-bold leading-snug text-foreground group-hover:text-brand">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
            The office behind AlumTrack
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-foreground">
            Office of Alumni Relations and Career Center
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Created in 1972 under the supervision of the Office of the President, OARCC enhances
            mutuality of interests and concerns between the University and her pride - her alumni.
          </p>
          <Link
            to="/oarcc"
            className="mt-6 inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-dark"
          >
            Learn about the office <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="space-y-3">
          {[
            "MSU System Alumni Data Bank",
            "Alumni job placement program",
            "Linkages with alumni chapters worldwide",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-sm border-l-4 border-highlight bg-card px-5 py-4 text-sm font-medium text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
