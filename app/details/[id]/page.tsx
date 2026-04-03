import Link from "next/link";

export default async function DetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Feature Details</h1>
      <p className="mt-2 text-sm text-slate-600">
        Selected feature id: <span className="font-semibold">{id}</span>
      </p>
      <p className="mt-4 text-sm text-slate-500">
        This page is opened from the popup action button. You can replace this
        with a richer report view or fetch detailed records from your API.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Back to Map
      </Link>
    </main>
  );
}
