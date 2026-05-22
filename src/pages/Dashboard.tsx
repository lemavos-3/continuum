import { Children, ComponentType, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, graphApi, metricsApi, notesApi, vaultApi, insightsApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getPlanLimits } from "@/lib/plan";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Share2,
  Activity,
  FolderOpen,
  ArrowRight,
  HardDrive,
  Network,
  FileText,
  Tag,
  Flame,
  Users,
  Clock,
  TrendingUp,
  StickyNote,
  RefreshCw
} from "@/lib/heroicons";
import type { Entity } from "@/types";

// --- TYPES & HELPERS FROM INSIGHTS ---
interface NoteInsight {
  note: { id: string; title: string; type?: string; entityIds?: string[]; updatedAt?: string; };
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
  entity: { id: string; title: string; type?: string; };
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

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- SUB-COMPONENTS ---
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-6">
      <div className="h-16 rounded-2xl bg-neutral-900/40 border border-white/5 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-[340px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-5 h-[340px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-5 h-[280px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-7 h-[280px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
      </div>
    </div>
  </AppLayout>
);

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string; }) {
  return (
    <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-1.5 min-w-0 shadow-inner transition-all duration-300 hover:border-white/10">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold text-neutral-100 tabular-nums leading-none mt-1">{value}</p>
      {hint && <p className="text-[11px] text-neutral-500 truncate mt-0.5">{hint}</p>}
    </div>
  );
}

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
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-white/5 bg-neutral-900/40 p-4 text-left shadow-sm",
        "transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/60 hover:shadow-md",
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
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-white/5 bg-neutral-900/40 p-4 text-left shadow-sm",
        "transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/60 hover:shadow-md",
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
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)} tracked</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastMention)}</StatChip>
      </div>
    </motion.button>
  );
}

function DashboardInsightSection({
  title, subtitle, icon: Icon, children, empty, loading, className, onRefresh, refreshing, viewMoreHref, viewMoreLabel
}: {
  title: string; subtitle?: string; icon: ComponentType<{ className?: string }>; children: ReactNode; empty: boolean; loading: boolean; className?: string; onRefresh?: () => void; refreshing?: boolean; viewMoreHref?: string; viewMoreLabel?: string;
}) {
  const navigate = useNavigate();
  const items = Children.toArray(children);
  const previewItems = items.slice(0, 3);
  const expandedItems = items.slice(3, 10);
  const totalCount = items.length;
  const visibleCount = Math.min(10, totalCount);
  const showAccordion = !loading && !empty && items.length > 3;

  return (
    <div className={cn("border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 flex flex-col shadow-inner", className)}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          {viewMoreHref && (
            <button
              type="button"
              onClick={() => navigate(viewMoreHref)}
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              {viewMoreLabel || "View all"}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-[140px] w-full animate-pulse rounded-xl border border-white/5 bg-neutral-900/30" />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-6 text-center text-xs text-neutral-500 h-full flex flex-col items-center justify-center min-h-[140px]">
            Nothing to show yet.
          </div>
        ) : (
          <>
            <div className="space-y-3">{previewItems}</div>
            {showAccordion ? (
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value={title}>
                  <AccordionTrigger className="px-0">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors">
                      <span>Show {visibleCount - previewItems.length} more</span>
                      <span>{visibleCount} of {totalCount}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-3">
                      {expandedItems}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-400">
                      <span>{totalCount > visibleCount ? `Showing ${visibleCount} of ${totalCount}` : `Showing all ${visibleCount}`}</span>
                      {viewMoreHref && (
                        <button
                          type="button"
                          onClick={() => navigate(viewMoreHref)}
                          className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                          {viewMoreLabel || "View all"}
                        </button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage, applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);
  const [exporting, setExporting] = useState(false);

  // Insights State
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);

  const loadInsights = async (silent = false) => {
    if (!silent) setInsightsLoading(true);
    else setRefreshingInsights(true);
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
      setInsightsLoading(false);
      setRefreshingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { authApi } = await import("@/lib/api");
      const res = await authApi.exportData();
      const json = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", "list"],
    queryFn: () => notesApi.list().then((r) => r.data),
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then((r) => r.data),
  });

  const { data: scoreTimeline } = useQuery({
    queryKey: ["metrics", "scoreTimeline"],
    queryFn: () => metricsApi.scoreTimeline(14).then((r) => r.data),
  });

  const { data: vaultFiles } = useQuery({
    queryKey: ["vault", "files"],
    queryFn: () => vaultApi.list().then((r) => r.data),
  });

  const vaultUsedMB = vaultFiles?.reduce((t, f) => t + f.size / (1024 * 1024), 0) ?? 0;
  const vaultMaxMB = limits.maxVaultSizeMB;
  const storageUsed = `${vaultUsedMB.toFixed(1)} MB`;
  const storageLimit = vaultMaxMB === -1 ? "Unlimited" : `${vaultMaxMB} MB`;

  useEffect(() => {
    if (vaultFiles == null || usage == null) return;
    const storageMB = Number(vaultUsedMB.toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [vaultFiles, vaultUsedMB, usage, applyUsageDelta]);

  const scoreTimelineData = useMemo(() => {
    if (!Array.isArray(scoreTimeline)) return [];
    return scoreTimeline.map((point: any) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [scoreTimeline]);

  const recentNotes = useMemo(() => {
    if (summary?.recentNotes && summary.recentNotes.length > 0) {
      return summary.recentNotes.slice(0, 6);
    }
    if (!Array.isArray(notes)) return [];
    return [...notes]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt).getTime(),
      }));
  }, [summary?.recentNotes, notes]);

  const graphNodeCount = graphData?.nodes?.length ?? 0;
  const totalNotes = summary?.stats?.totalNotes ?? 0;
  const totalEntities = summary?.stats?.totalEntities ?? 0;

  if (summaryLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = user?.username || user?.email?.split("@")[0] || "there";

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="border-b border-white/5 pb-6 mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold mb-1">Overview</p>
            <h1 className="font-serif text-4xl tracking-tight text-neutral-100">
              {greeting}, {displayName}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Here's what's happening across your knowledge graph.
            </p>
          </div>
        </header>

        {/* CONTADORES / CARDS KPI */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Notes" value={totalNotes} hint={limits.maxNotes === -1 ? "Unlimited" : `of ${limits.maxNotes}`} />
          <StatCard icon={Tag} label="Entities" value={totalEntities} hint={limits.maxEntities === -1 ? "Unlimited" : `of ${limits.maxEntities}`} />
          <StatCard icon={Network} label="Graph nodes" value={graphNodeCount} hint="In your network" />
          <StatCard icon={HardDrive} label="Storage" value={storageUsed} hint={`of ${storageLimit}`} />
        </section>

        {/* CORPO DO DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* GRÁFICO HISTÓRICO DE SCORE */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Share2 className="h-4 w-4 text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">Score evolution</h2>
                  <p className="text-xs text-neutral-500">Last 14 days</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/insights")}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Explore insights →
              </button>
            </div>
            <div className="h-[220px] sm:h-[250px] -mx-2">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="white" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#737373", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#737373", fontSize: 10 }} width={24} />
                    <Tooltip
                      contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12, color: "#f5f5f5" }}
                      labelStyle={{ color: "#737373" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} fill="url(#scoreFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          {/* PLAN USAGE CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-neutral-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-neutral-200">Plan usage</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                  {user?.plan || "FREE"}
                </span>
              </div>

              {usage ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Notes</span>
                      <span className="text-neutral-200 font-mono tabular-nums">
                        {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                      </span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Entities</span>
                      <span className="text-neutral-200 font-mono tabular-nums">
                        {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                      </span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Vault storage</span>
                      <span className="text-neutral-200 font-mono tabular-nums">{storageUsed} / {storageLimit}</span>
                    </div>
                    <Progress value={limits.maxVaultSizeMB === -1 ? 0 : Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500">Loading usage…</div>
              )}

              <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-neutral-500 text-[10px] uppercase font-medium">History retention</span>
                    <span className="text-neutral-300 font-medium">{limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days`}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-neutral-500 text-[10px] uppercase font-medium">Metadata limit</span>
                    <span className="text-neutral-300 font-medium">{limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB`}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 sm:col-span-2 pt-2 border-t border-white/5 mt-1">
                    <span>Data export</span>
                    {user?.dataExport ? (
                      <button
                        type="button"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="text-neutral-200 underline underline-offset-4 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {exporting ? "Exporting…" : "Download backup"}
                      </button>
                    ) : (
                      <span className="text-neutral-500 text-xs">Upgrade to enable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="mt-5 text-xs text-neutral-400 hover:text-white self-start transition-colors"
            >
              Manage subscription →
            </button>
          </div>

          {/* RECENT NOTES CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-5 flex flex-col shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="h-4 w-4 text-neutral-400" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-200">Recent notes</h2>
              </div>
              <button type="button" onClick={() => navigate("/notes")} className="text-xs text-neutral-400 hover:text-white transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:bg-neutral-900/40 hover:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-300 group-hover:text-white truncate">{note.title || "Untitled"}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono text-neutral-500">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-6 text-center text-xs text-neutral-500">
                  No recent notes yet.
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS: HOT RIGHT NOW */}
          <DashboardInsightSection
            title="Hot right now"
            subtitle="Strongest recent gravity"
            icon={Flame}
            loading={insightsLoading}
            empty={hotNotes.length === 0}
            className="lg:col-span-7"
            onRefresh={() => loadInsights(true)}
            refreshing={refreshingInsights}
            viewMoreHref="/notes"
            viewMoreLabel="View all notes"
          >
            {hotNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: KEY PEOPLE & PROJECTS */}
          <DashboardInsightSection
            title="Key people & projects"
            subtitle="Trending entities"
            icon={Users}
            loading={insightsLoading}
            empty={hotEntities.length === 0}
            className="lg:col-span-6"
            viewMoreHref="/entities"
            viewMoreLabel="View all entities"
          >
            {hotEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: WORTH REVISITING */}
          <DashboardInsightSection
            title="Worth revisiting"
            subtitle="High-value notes"
            icon={Clock}
            loading={insightsLoading}
            empty={forgottenNotes.length === 0}
            className="lg:col-span-6"
            viewMoreHref="/notes"
            viewMoreLabel="View all notes"
          >
            {forgottenNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: FORGOTTEN GEMS */}
          <DashboardInsightSection
            title="Forgotten gems"
            subtitle="Entities that once mattered"
            icon={TrendingUp}
            loading={insightsLoading}
            empty={forgottenEntities.length === 0}
            className="lg:col-span-12"
            viewMoreHref="/entities"
            viewMoreLabel="View all entities"
          >
            {forgottenEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

        </section>
      </div>
    </AppLayout>
  );
          }
