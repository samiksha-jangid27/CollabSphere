// ABOUTME: Authenticated app shell layout for the (main) route group — Editorial Noir masthead nav.
// ABOUTME: Auth gate, top nav with tracked uppercase links, centered content, Framer Motion fadeUp.

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { fadeUp } from "@/lib/motion";

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  active: boolean;
  soon?: boolean;
};

const NAV_ITEMS: ReadonlyArray<Omit<NavItem, "active">> = [
  {
    label: "Profile",
    href: "/profile/me",
    match: (pathname) => pathname.startsWith("/profile"),
  },
  {
    label: "Discover",
    href: "#",
    match: () => false,
    soon: true,
  },
  {
    label: "Collaborate",
    href: "#",
    match: () => false,
    soon: true,
  },
  {
    label: "Messages",
    href: "#",
    match: () => false,
    soon: true,
  },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-0">
        <span className="type-eyebrow fixed bottom-6 left-6 text-paper-muted">
          Loading
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const items: NavItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    active: item.match(pathname),
  }));

  return (
    <div className="min-h-screen bg-ink-0 text-paper flex flex-col">
      <header
        className="sticky top-0 z-40 bg-ink-0/95 backdrop-blur-sm border-b border-line-subtle"
        style={{ WebkitBackdropFilter: "blur(8px)" }}
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{
            height: "var(--nav-h, 72px)",
            maxWidth: "1440px",
            paddingLeft: "clamp(24px, 5vw, 64px)",
            paddingRight: "clamp(24px, 5vw, 64px)",
          }}
        >
          <Link
            href="/profile/me"
            className="group flex items-baseline gap-3 text-paper hover:text-paper"
            aria-label="CollabSphere"
          >
            <span
              aria-hidden
              className="type-mono text-paper-muted"
              style={{ letterSpacing: "0.08em" }}
            >
              CS
            </span>
            <span
              aria-hidden
              className="hidden sm:block h-4 w-px bg-line"
            />
            <span
              className="font-display text-paper"
              style={{
                fontSize: "22px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                fontVariationSettings: '"SOFT" 30, "opsz" 24',
              }}
            >
              CollabSphere
            </span>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-8">
            {items.map((item) => {
              const isProfile = item.label === "Profile";
              const visibilityClass = isProfile ? "" : "hidden sm:inline-flex";

              if (item.soon) {
                return (
                  <span
                    key={item.label}
                    className={`type-eyebrow relative inline-flex items-center gap-2 text-paper-muted select-none ${visibilityClass}`}
                    title="Coming soon"
                    style={{ cursor: "default", opacity: 0.45 }}
                    aria-disabled="true"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`type-eyebrow relative inline-flex items-center gap-2 ${item.active ? "text-paper" : "text-paper-dim"} hover:text-paper ${visibilityClass}`}
                  style={{ transition: "color 150ms linear" }}
                >
                  {item.label}
                  {item.active && (
                    <span
                      aria-hidden
                      className="absolute left-0 right-0 -bottom-2 h-px"
                      style={{ background: "var(--amber)" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main
        className="flex-1 w-full mx-auto"
        style={{
          maxWidth: "1200px",
          paddingLeft: "clamp(24px, 5vw, 64px)",
          paddingRight: "clamp(24px, 5vw, 64px)",
          paddingTop: "clamp(48px, 9vw, 96px)",
          paddingBottom: "clamp(48px, 9vw, 96px)",
        }}
      >
        <motion.div
          key={pathname}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          {children}
        </motion.div>
      </main>

      <footer className="w-full">
        <hr className="rule-line-subtle" />
        <div style={{ height: "48px" }} />
      </footer>
    </div>
  );
}
