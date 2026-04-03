import dynamic from "next/dynamic";
import Link from "next/link";

const MapComponent = dynamic(() => import("@/components/Map"), {
  loading: () => <div className="map-skeleton">Loading map...</div>,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              ArcGIS Renderer Studio
            </h1>
            <p className="text-xs text-slate-500">
              Unique value, class breaks, popups, graphics, tiles, and querying.
            </p>
          </div>

          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              href="/"
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700"
            >
              Home
            </Link>
            <Link
              href="/map-page"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              West Coast
            </Link>
            <Link
              href="/advanced"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Advanced
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1600px] px-6 py-6">
        <MapComponent />
      </section>
    </main>
  );
}
