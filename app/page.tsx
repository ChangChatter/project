import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        BC Employer Issue Guide
      </h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        Matching and guide output land in later sprints.
      </p>
      <Link
        href="/intake"
        className="mt-6 inline-block text-blue-700 underline dark:text-blue-400"
      >
        Start intake
      </Link>
      <br />
      <Link
        href="/about"
        className="mt-2 inline-block text-blue-700 underline dark:text-blue-400"
      >
        View the placeholder route
      </Link>
    </div>
  );
}
