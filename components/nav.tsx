"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "dashboard" },
  { href: "/notes", label: "notes" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="u-display text-2xl leading-none text-foreground"
        >
          notes
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center gap-2 px-3 text-sm lowercase transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1 rounded-full transition-colors",
                    active ? "bg-primary" : "bg-transparent"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
