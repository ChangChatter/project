"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/intake", label: "Intake" },
  { href: "/about", label: "Method" },
] as const;

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav no-print">
      <span className="nav-brand">
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "10.5px",
            letterSpacing: "0.16em",
            color: "var(--color-accent)",
          }}
        >
          BC
        </span>{" "}
        Employer Issue Guide
      </span>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
