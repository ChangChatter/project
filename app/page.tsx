import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        BC Employer Issue Guide
      </h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        This is the app skeleton. Intake, matching, and guide output land in
        later sprints.
      </p>
      <Link
        href="/about"
        className="mt-6 inline-block text-blue-700 underline dark:text-blue-400"
      >
        View the placeholder route
      </Link>
    </div>
  );
}
