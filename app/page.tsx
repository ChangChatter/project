import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

/**
 * Landing page — docs/design-handoff.md §Screens 1, "reassuring" framing
 * variant (the only one of the handoff's four toggles this sprint
 * implements; the other three are locked and deferred — see the sprint
 * file). Band C's copy ("What this guide is careful about") has no
 * verbatim text in the handoff and was authored here; flagged in Dev
 * Notes for gate 4 alongside the hero's reassurance framing.
 */
export default function Home() {
  return (
    <div>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: "48px",
          alignItems: "end",
          maxWidth: "1060px",
          margin: "0 auto",
          padding: "56px 30px 48px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "10.5px",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--color-accent-700)",
              marginBottom: "18px",
            }}
          >
            Human Rights Code · Employment Standards · WorkSafeBC
          </p>
          <h1
            style={{
              fontSize: "clamp(37px, 4.8vw, 60px)",
              fontWeight: 400,
              lineHeight: 1.04,
              maxWidth: "17ch",
              textWrap: "balance",
            }}
          >
            Most of these situations are workable.
          </h1>
          <hr
            className="hr"
            style={{ background: "var(--color-accent)", margin: "0 0 20px" }}
          />
          <p style={{ fontSize: "17px", lineHeight: 1.62, maxWidth: "52ch", textWrap: "pretty" }}>
            Answer a few questions about what has happened, and this guide will lay
            out one clear path forward — the order to do things in, what to write
            down, and which dates you need to watch. Built for British Columbia
            employers and the people who advise them.
          </p>
          <div style={{ display: "flex", gap: "11px", flexWrap: "wrap" }}>
            <Link
              href="/intake"
              className="btn btn-primary"
              style={{ fontSize: "15px", padding: "11px 22px" }}
            >
              Start intake
              <ArrowRightIcon size={15} />
            </Link>
            <Link
              href="/about"
              className="btn btn-secondary"
              style={{ fontSize: "15px", padding: "11px 22px" }}
            >
              How this is assessed
            </Link>
          </div>
          <p className="text-muted" style={{ fontSize: "12px", marginTop: "18px" }}>
            Takes about six minutes. Nothing you type leaves your browser.
          </p>
        </div>

        <div
          style={{
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-neutral-100)",
            padding: "22px 26px 6px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-accent-700)",
              margin: 0,
            }}
          >
            What you get back
          </p>
          {[
            {
              n: "01",
              title: "One recommended path",
              body: "Not a menu of options — the sequence that fits the facts you gave, step by step.",
            },
            {
              n: "02",
              title: "The dates that matter",
              body: "Filing windows and internal response times, counted from your incident date.",
            },
            {
              n: "03",
              title: "A file you can hand over",
              body: "What to gather, what to avoid doing, printable for counsel.",
            },
          ].map((row) => (
            <div
              key={row.n}
              style={{
                display: "grid",
                gridTemplateColumns: "28px minmax(0,1fr)",
                gap: "15px",
                padding: "15px 0",
                borderTop: "1px solid var(--color-divider)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "19px",
                  color: "var(--color-accent-700)",
                  fontFeatureSettings: "'tnum'",
                }}
              >
                {row.n}
              </span>
              <span>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "16px",
                  }}
                >
                  {row.title}
                </span>
                <span style={{ display: "block", fontSize: "13.5px", lineHeight: 1.55, opacity: 0.8 }}>
                  {row.body}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          background: "var(--color-colophon)",
          color: "var(--color-neutral-200)",
          padding: "50px 30px",
        }}
      >
        <div style={{ maxWidth: "1060px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "10.5px",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--color-accent-400)",
              marginBottom: "18px",
            }}
          >
            The three passes
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "34px",
            }}
          >
            {[
              {
                numeral: "I",
                title: "Context",
                body: "Where things stand today — status, tenure, and whether anything has been formally lodged yet.",
              },
              {
                numeral: "II",
                title: "Concern",
                body: "How the employee has framed the issue, plus the features of the matter you think are relevant.",
              },
              {
                numeral: "III",
                title: "Narrative",
                body: "The sequence in your own words, with a date. This is what sets the timeline and the document list.",
              },
            ].map((cell) => (
              <div key={cell.numeral} style={{ position: "relative" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "-20px",
                    left: "-4px",
                    fontFamily: "var(--font-heading)",
                    fontSize: "78px",
                    lineHeight: 1,
                    color: "var(--color-accent)",
                    opacity: 0.22,
                  }}
                >
                  {cell.numeral}
                </span>
                <div style={{ position: "relative" }}>
                  <hr
                    className="hr"
                    style={{ background: "var(--color-accent)", opacity: 0.5, margin: "0 0 12px" }}
                  />
                  <h3 style={{ fontSize: "22px", fontWeight: 400, color: "var(--color-neutral-100)" }}>
                    {cell.title}
                  </h3>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--color-neutral-300)" }}>
                    {cell.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: "40px",
          maxWidth: "1060px",
          margin: "0 auto",
          padding: "48px 30px 68px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 400 }}>What this guide is careful about</h2>
          <hr className="hr" />
        </div>
        <div>
          <p style={{ fontSize: "14.5px", lineHeight: 1.7, textAlign: "justify", hyphens: "auto" }}>
            This tool doesn&apos;t predict how a complaint would be decided, and it
            doesn&apos;t tell you the odds of any particular outcome. What it does is
            trace your answers back to specific, named obligations — under the{" "}
            <em>Human Rights Code</em>, the <em>Employment Standards Act</em>, and
            related BC frameworks — so the path it lays out is the one those
            obligations actually point to, not general best practice.
          </p>
          <p style={{ fontSize: "14.5px", lineHeight: 1.7, textAlign: "justify", hyphens: "auto" }}>
            The dates it calculates are arithmetic, counted from the date you give
            it. They don&apos;t account for extensions, tolling, or a tribunal&apos;s
            discretion to accept something filed late. Treat every date as a
            starting point to verify, not a deadline to rely on without checking.
          </p>
        </div>
      </section>
    </div>
  );
}
