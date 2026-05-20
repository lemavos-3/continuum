import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  StickyNote,
  Network,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { insightsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface NoteInsight {
  note: {
    id: string;
    title: string;
    type?: string;
    entityIds?: string[];
    updatedAt?: string;
  };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  entityConnections: number;
  uniqueDaysReferenced: number;
  daysSinceLastInteraction: number;
}

interface EntityInsight {
  entity: {
    id: string;
    title: string;
    type?: string;
  };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  relationsCount: number;
  uniqueDaysMentioned: number;
  daysSinceLastMention: number;
}

const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number) => {
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-violet-500/10 text-violet-400 border-violet-500/20";
  if (b.includes("key")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (b.includes("high")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  return "bg-white/5 text-neutral-300 border-white/10";
};

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400 font-medium">
      {children}
    </span>
  );
}

function NoteCard({ item, onOpen }: { item: NoteInsight; onOpen: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/20 p-4 text-left shadow-inner",
        "backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/40 hover:shadow-xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[10px] font-medium shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[10px] text-neutral-500">{item.score.toFixed(1)}</span>
      </div>

      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-lg bg-white/5 p-1 border border-white/5 shrink-0">
          <StickyNote className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{item.note.title || "Untitled"}</h3>
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} mentions</StatChip>}
        {item.entityConnections > 0 && <StatChip>{item.entityConnections} links</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)} tracked</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastInteraction)}</StatChip>
      </div>
    </motion.button>
  );
}

function EntityCard({ item, onOpen }: { item: EntityInsight; onOpen: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/20 p-4 text-left shadow-inner",
        "backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/40 hover:shadow-xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[10px] font-medium shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[10px] text-neutral-500">{item.score.toFixed(1)}</span>
      </div>

      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded-lg bg-white/5 p-1 border border-white/5 shrink-0">
          <Network className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{item.entity.title}</h3>
          {item.entity.type && (
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">{item.entity.type}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} mentions</StatChip>}
        {item.relationsCount > 0 && <StatChip>{item.relationsCount} relations</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)} tracked</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastMention)}</StatChip>
      </div>
    </motion.button>
  );
}

type InsightCategory = "hotNotes" | "hotEntities" | "worthRevisiting" | "forgottenGems";

type View = "all" | InsightCategory;

interface InsightItem {
  id: string;
  kind: "note" | "entity";
  category: InsightCategory;
  score: number;
  badge: string;
  title: string;
  subtitle: string;
  details: string;
  onOpen: () => void;
}

const CATEGORY_META: Record<InsightCategory, { label: string; subtitle: string; icon: typeof Flame; accent: string }> = {
  hotNotes: {
    label: "Hot notes",
    subtitle: "Recent notes with the strongest signal.",
    icon: Flame,
    accent: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  },
  hotEntities: {
    label: "Key people & projects",
    subtitle: "Entities that are appearing across your network.",
    icon: Users,
    accent: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  },
  worthRevisiting: {
    label: "Worth revisiting",
    subtitle: "Notes that are valuable but haven't been touched lately.",
    icon: Clock,
    accent: "border-violet-500/20 bg-violet-500/10 text-violet-400",
  },
  forgottenGems: {
    label: "Forgotten gems",
    subtitle: "Entities that once mattered and deserve another look.",
    icon: TrendingUp,
    accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
};

function NavItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
        active ? "bg-white/5 text-white" : "text-neutral-300 hover:text-white hover:bg-white/5",
      )}
    >
      <span>{label}</span>
      <span className="font-mono text-xs text-neutral-500 group-hover:text-neutral-400">{count}</span>
    </button>
  );
}

function buildInsightItems(
  hotNotes: NoteInsight[],
  hotEntities: EntityInsight[],
  forgottenNotes: NoteInsight[],
  forgottenEntities: EntityInsight[],
  navigate: (path: string) => void,
) {
  const items: InsightItem[] = [];

  hotNotes.forEach((item) => {
    items.push({
      id: item.note.id,
      kind: "note",
      category: "hotNotes",
      score: item.score,
      badge: item.badge,
      title: item.note.title || "Untitled",
      subtitle: "Note",
      details: `${item.mentionCount} mentions · ${item.entityConnections} links · ${formatHours(item.hoursTracked) || "0m"} tracked · ${formatDays(item.daysSinceLastInteraction)}`,
      onOpen: () => navigate(`/notes/${item.note.id}`),
    });
  });

  hotEntities.forEach((item) => {
    items.push({
      id: item.entity.id,
      kind: "entity",
      category: "hotEntities",
      score: item.score,
      badge: item.badge,
      title: item.entity.title,
      subtitle: item.entity.type || "Entity",
      details: `${item.mentionCount} mentions · ${item.relationsCount} relations · ${formatHours(item.hoursTracked) || "0m"} tracked · ${formatDays(item.daysSinceLastMention)}`,
      onOpen: () => navigate(`/entities/${item.entity.id}`),
    });
  });

  forgottenNotes.forEach((item) => {
    items.push({
      id: item.note.id,
      kind: "note",
      category: "worthRevisiting",
      score: item.score,
      badge: item.badge,
      title: item.note.title || "Untitled",
      subtitle: "Note",
      details: `${item.mentionCount} mentions · ${item.entityConnections} links · ${formatHours(item.hoursTracked) || "0m"} tracked · ${formatDays(item.daysSinceLastInteraction)}`,
      onOpen: () => navigate(`/notes/${item.note.id}`),
    });
  });

  forgottenEntities.forEach((item) => {
    items.push({
      id: item.entity.id,
      kind: "entity",
      category: "forgottenGems",
      score: item.score,
      badge: item.badge,
      title: item.entity.title,
      subtitle: item.entity.type || "Entity",
      details: `${item.mentionCount} mentions · ${item.relationsCount} relations · ${formatHours(item.hoursTracked) || "0m"} tracked · ${formatDays(item.daysSinceLastMention)}`,
      onOpen: () => navigate(`/entities/${item.entity.id}`),
    });
  });

  return items.sort((a, b) => b.score - a.score);
}

function InsightCard({ item }: { item: InsightItem }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={item.onOpen}
      className="group w-full rounded-3xl border border-white/5 bg-neutral-900/20 p-4 text-left transition hover:border-white/10 hover:bg-neutral-900/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border text-[10px] font-medium shadow-sm", badgeStyle(item.badge))}>
              {item.badge}
            </Badge>
            <span className="text-xs text-neutral-500">{item.subtitle}</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-100 line-clamp-2">{item.title}</h3>
          <p className="mt-2 text-sm text-neutral-500">{item.details}</p>
        </div>
        <span className="font-mono text-xs text-neutral-400">{item.score.toFixed(1)}</span>
      </div>
    </motion.button>
  );
}

export default function Insights() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);

      setHotNotes(hn.data || []);
      setForgottenNotes(fn.data || []);
      setHotEntities(he.data || []);
      setForgottenEntities(fe.data || []);
    } catch (err) {
      toast({ title: "Couldn't load insights", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const insights = useMemo(
    () => buildInsightItems(hotNotes, hotEntities, forgottenNotes, forgottenEntities, navigate),
    [hotNotes, hotEntities, forgottenNotes, forgottenEntities, navigate],
  );

  const filteredInsights = useMemo(() => {
    const query = search.trim().toLowerCase();
    return insights.filter((item) => {
      if (view !== "all" && item.category !== view) return false;
      if (!query) return true;
      return [item.title, item.subtitle, item.badge, item.details].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [insights, search, view]);

  const groupedInsights = useMemo(
    () =>
      filteredInsights.reduce((acc, item) => {
        acc[item.category] = [...(acc[item.category] || []), item];
        return acc;
      }, {} as Record<InsightCategory, InsightItem[]>),
    [filteredInsights],
  );

  const counts = {
    hotNotes: hotNotes.length,
    hotEntities: hotEntities.length,
    worthRevisiting: forgottenNotes.length,
    forgottenGems: forgottenEntities.length,
  };

  const totalSignal = insights.length;
  const topScore = Math.max(0, ...insights.map((item) => item.score));
  const categoryOrder: InsightCategory[] = ["hotNotes", "hotEntities", "worthRevisiting", "forgottenGems"];

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-8">
        <header className="border-b border-white/5 pb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500 font-semibold">Insights</p>
            </div>
            <div>
              <h1 className="text-4xl font-serif tracking-tight text-neutral-100">Insights</h1>
              <p className="mt-3 max-w-2xl text-sm text-neutral-500">
                Surface notes and entities that matter most — so nothing important gets buried.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
              className="h-9 border-white/5 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-900/80 hover:text-white rounded-xl shadow-md transition-all gap-2"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              <span className="text-xs font-medium">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden h-9 border-white/5 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-900/80 hover:text-white rounded-xl shadow-md transition-all gap-2"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-3xl p-4 shadow-inner">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Signals</p>
            <p className="mt-4 text-3xl font-semibold text-neutral-100 tabular-nums">{totalSignal}</p>
            <p className="mt-2 text-xs text-neutral-500">Total insights loaded across notes and entities.</p>
          </div>
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-3xl p-4 shadow-inner">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Top score</p>
            <p className="mt-4 text-3xl font-semibold text-neutral-100 tabular-nums">{topScore.toFixed(1)}</p>
            <p className="mt-2 text-xs text-neutral-500">Highest signal strength in this batch.</p>
          </div>
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-3xl p-4 shadow-inner">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">Revisit</p>
            <p className="mt-4 text-3xl font-semibold text-neutral-100 tabular-nums">{counts.worthRevisiting + counts.forgottenGems}</p>
            <p className="mt-2 text-xs text-neutral-500">Notes and entities that should be reviewed again.</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="space-y-4 rounded-3xl border border-white/5 bg-neutral-900/20 p-4 shadow-inner">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Filters</p>
                <div className="space-y-2">
                  <NavItem label="All insights" count={insights.length} active={view === "all"} onClick={() => setView("all")} />
                  {categoryOrder.map((category) => (
                    <NavItem
                      key={category}
                      label={CATEGORY_META[category].label}
                      count={counts[category]}
                      active={view === category}
                      onClick={() => setView(category)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search insights"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-32 w-full animate-pulse rounded-3xl border border-white/5 bg-neutral-900/20"
                    />
                  ))}
                </div>
              ) : filteredInsights.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/5 bg-neutral-900/5 p-10 text-center text-sm text-neutral-500">
                  <p className="text-neutral-200 font-semibold">No results found</p>
                  <p className="mt-2">Try another search term or select a different insight category.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {[...(view === "all" ? categoryOrder : [view])].map((category) => {
                    const items = groupedInsights[category] || [];
                    if (!items.length) return null;
                    const meta = CATEGORY_META[category];
                    const Icon = meta.icon;
                    const listPath = category === "hotEntities" || category === "forgottenGems" ? "/entities" : "/notes";
                    return (
                      <section key={category} className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-neutral-500">
                              <Icon className="h-4 w-4 text-neutral-400" />
                              <span>{meta.label}</span>
                            </div>
                            <p className="mt-2 text-sm text-neutral-500">{meta.subtitle}</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button variant="ghost" size="sm" onClick={() => setView(category)}>
                              View only
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(listPath)}>
                              Open list
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-4">
                          {items.map((item) => (
                            <InsightCard key={`${item.kind}-${item.id}-${item.category}`} item={item} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent position="left" size="full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Filters</p>
                  <h2 className="text-xl font-semibold text-neutral-100">Insight categories</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFilterDrawerOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="space-y-2">
                <NavItem
                  label="All insights"
                  count={insights.length}
                  active={view === "all"}
                  onClick={() => {
                    setView("all");
                    setFilterDrawerOpen(false);
                  }}
                />
                {categoryOrder.map((category) => (
                  <NavItem
                    key={category}
                    label={CATEGORY_META[category].label}
                    count={counts[category]}
                    active={view === category}
                    onClick={() => {
                      setView(category);
                      setFilterDrawerOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
