import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Tracking</p>
              <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">Projects</h1>
            </div>
            <p className="mt-3 text-sm text-white/40">Track your project activities and milestones.</p>
          </header>

          <div className="sticky top-14 z-10 -mx-4 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Navigate your timeline…"
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0"
                />
              </div>
              <button
                onClick={() => console.log("New action triggered")}
                className="flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end border-b border-white/5 pb-3 pt-4 mb-6 text-[11px] text-white/40">
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5">
                <span>Sort by:</span>
                <button
                  onClick={() => setSortBy(sortBy === "createdAt" ? "updatedAt" : "createdAt")}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  [{sortBy === "createdAt" ? "Creation" : "Modification"}]
                </button>
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
                </svg>
                {sortOrder === "desc" ? "Recent" : "Oldest"}
              </button>
            </div>
          </div>

          <TimeTrackingList
            filterType="PROJECT"
            search={search}
            sortBy={sortBy}
            sortOrder={sortOrder}
            hideInternalSearch={true}
          />
        </main>
      </div>
    </AppLayout>
  );
}
