import Link from "next/link";

export default function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Placeholder route
      </h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        This route exists to prove the disclaimer banner persists across
        navigation. It is not a product feature.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-blue-700 underline dark:text-blue-400"
      >
        Back to landing
      </Link>
    </div>
  );
}
