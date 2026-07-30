import { Children, ComponentType, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, graphApi, metricsApi, notesApi, vaultApi, insightsApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useCreateNote } from "@/hooks/useCreateNote";
import UpgradeModal from "@/components/UpgradeModal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPlanLimits, isUnlimited } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
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
  RefreshCw,
  Plus,
  Loader2
} from "@/lib/heroicons";

// --- TYPES & HELPERS ---
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

const rangeDaysMap = {
  "14d": 14,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "total": 3650,
};
type TimeRange = keyof typeof rangeDaysMap;

const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number, t: (key: string, vars?: Record<string, string | number>) => string) => {
  if (d <= 0) return t("db_today");
  if (d < 30) return t("db_dAgo", { n: d });
  if (d < 365) return t("db_moAgo", { n: Math.round(d / 30) });
  return t("db_yAgo", { n: Math.round(d / 365) });
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-white/[0.06] text-white/90 border-white/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-white/[0.04] text-white/70 border-white/10";
  return "bg-transparent text-white/50 border-white/10";
};

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- SUB-COMPONENTS ---
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      <div className="h-16 rounded-2xl bg-neutral-900/40 border border-white/5 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-[360px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-4 h-[360px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
      </div>
    </div>
  </AppLayout>
);

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string; }) {
  return (
    <Card variant="subtle" className="p-4 flex flex-col gap-1 min-w-0 transition-colors hover:border-white/10">
      <div className="flex items-center gap-1.5 text-white/30">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="text-[9px] uppercase tracking-widest font-mono truncate">{label}</span>
      </div>
      <p className="text-2xl font-mono tracking-tight text-white tabular-nums leading-none mt-2 truncate">{value}</p>
      {hint && <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 truncate mt-1">{hint}</p>}
    </Card>
  );
}

function SummaryMetric({ label, value, delta, comparison }: { label: string; value: string; delta: number; comparison: string }) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const arrow = isDown ? "↓" : isUp ? "↑" : "–";
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40 font-mono truncate">{label}</p>
      <p className="font-serif text-4xl sm:text-5xl text-white leading-none tabular-nums truncate">{value}</p>
      <div className="inline-flex items-center gap-1.5 self-start rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-mono text-white/50">
        <span className={cn(isDown && "text-red-300/80", isUp && "text-emerald-300/80")}>{arrow} {Math.abs(delta)}</span>
        <span className="text-white/30">{comparison}</span>
      </div>
    </div>
  );
}

function WeeklySummary({ notes, totalNotes, totalEntities, graphNodeCount, currentScore }: {
  notes: any[]; totalNotes: number; totalEntities: number; graphNodeCount: number; currentScore: number;
}) {
  const { t } = useLanguage();
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const list = Array.isArray(notes) ? notes : [];
  const inRange = (n: any, from: number, to: number) => {
    const t = new Date(n?.createdAt || n?.updatedAt || 0).getTime();
    return t >= from && t < to;
  };
  const thisWeek = list.filter((n) => inRange(n, now - WEEK, now + 1)).length;
  const lastWeek = list.filter((n) => inRange(n, now - 2 * WEEK, now - WEEK)).length;
  const notesDelta = thisWeek - lastWeek;

  return (
    <Card variant="subtle" className="-mt-4 p-5 sm:-mt-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono hidden sm:block">{t("db_last7days")}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:gap-8">
        <SummaryMetric label={t("db_notes")} value={String(totalNotes)} delta={notesDelta} comparison={t("db_vsLastWeek")} />
        <SummaryMetric label={t("db_entities")} value={String(totalEntities)} delta={0} comparison={t("db_nodes", { n: graphNodeCount })} />
        <SummaryMetric label={t("db_score")} value={currentScore.toFixed(2)} delta={0} comparison={t("db_gravityIndex")} />
      </div>
    </section>
  );
}


function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-white/5 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
      {children}
    </span>
  );
}

function NoteCard({ item, onOpen }: { item: NoteInsight; onOpen: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-lg border border-white/[0.08] bg-card/90 backdrop-blur-xl p-4 text-left shadow-sm",
        "transition duration-300 hover:border-white/10 hover:bg-white/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("text-[9px] font-medium px-1.5 py-0 shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[9px] text-white/60">{item.score.toFixed(1)}</span>
      </div>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 rounded-lg bg-white/[0.04] p-1 shrink-0">
          <StickyNote className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <h3 className="line-clamp-2 text-xs sm:text-sm font-medium text-white transition-colors">{item.note.title || t("db_untitled")}</h3>
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} m</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)}</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastInteraction, t)}</StatChip>
      </div>
    </motion.button>
  );
}

function EntityCard({ item, onOpen }: { item: EntityInsight; onOpen: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-3 overflow-hidden rounded-lg border border-white/[0.08] bg-card/90 backdrop-blur-xl p-4 text-left shadow-sm",
        "transition duration-300 hover:border-white/10 hover:bg-white/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("text-[9px] font-medium px-1.5 py-0 shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[9px] text-white/60">{item.score.toFixed(1)}</span>
      </div>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 rounded-lg bg-white/[0.04] p-1 shrink-0">
          <Network className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-xs sm:text-sm font-medium text-white transition-colors">{item.entity.title}</h3>
          {item.entity.type && (
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/50 truncate">{item.entity.type}</p>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} m</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)}</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastMention, t)}</StatChip>
      </div>
    </motion.button>
  );
}

function DashboardInsightSection({
  title, subtitle, icon: Icon, children, empty, loading, className, onRefresh, refreshing, viewMoreHref, viewMoreLabel, gridColsClass = "grid-cols-1"
}: {
  title: string; subtitle?: string; icon: ComponentType<{ className?: string }>; children: ReactNode; empty: boolean; loading: boolean; className?: string; onRefresh?: () => void; refreshing?: boolean; viewMoreHref?: string; viewMoreLabel?: string; gridColsClass?: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const items = Children.toArray(children);
  const previewItems = items.slice(0, 4);
  const expandedItems = items.slice(4, 10);
  const totalCount = items.length;
  const visibleCount = Math.min(10, totalCount);
  const showAccordion = !loading && !empty && items.length > 4;

  return (
    <div className={cn("rounded-sm bg-neutral-950/70 p-4 sm:p-6 flex flex-col shadow-sm", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40 font-mono">{t("db_signal")}</p>
          <h2 className="mt-1 font-serif text-xl text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-white/50">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-end gap-4 mt-1 sm:mt-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              <span>{t("db_refresh")}</span>
            </button>
          )}
          {viewMoreHref && (
            <button
              type="button"
              onClick={() => navigate(viewMoreHref)}
              className="text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              {viewMoreLabel || t("db_viewAll")}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between min-h-0">
        {loading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-[120px] w-full animate-pulse rounded-xl bg-neutral-900/40" />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-xl bg-neutral-900/50 p-6 text-center text-xs text-white/40 h-full flex flex-col items-center justify-center min-h-[120px]">
            {t("db_nothingToShow")}
          </div>
        ) : (
          <>
            <div className={cn("grid gap-3", gridColsClass)}>{previewItems}</div>
            {showAccordion ? (
              <Accordion type="single" collapsible className="mt-3">
                <AccordionItem value={title} className="border-none">
                  <AccordionTrigger className="px-0 py-0 hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-neutral-900/50 px-3 py-2 text-xs font-medium text-white/50 hover:bg-neutral-900/60 transition-colors">
                      <span>{t("db_showMore", { n: visibleCount - previewItems.length })}</span>
                      <span>{t("db_countOfTotal", { count: visibleCount, total: totalCount })}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pt-3 pb-0">
                    <div className={cn("grid gap-3 mb-3", gridColsClass)}>
                      {expandedItems}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[10px] text-white/40 pt-2 border-t border-white/10">
                      <span>{totalCount > visibleCount ? t("db_showingOfTotal", { count: visibleCount, total: totalCount }) : t("db_showingAll", { count: visibleCount })}</span>
                      {viewMoreHref && (
                        <button
                          type="button"
                          onClick={() => navigate(viewMoreHref)}
                          className="text-white/50 hover:text-white transition-colors"
                        >
                          {viewMoreLabel || t("db_viewAll")}
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
  const { t } = useLanguage();
  const limits = getPlanLimits(user);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  const { createNote, creating } = useCreateNote({ onLimitReached: () => setUpgradeOpen(true) });

  // Check for new account onboarding popup
  useEffect(() => {
    const isNewAccount = localStorage.getItem('newAccountCreated') === 'true';
    if (isNewAccount) {
      setShowOnboardingPopup(true);
      localStorage.removeItem('newAccountCreated');
    }
  }, []);

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
      
      const extractData = (res: any) => {
        if (!res) return [];
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (d && typeof d === 'object') {
          return d.items || d.content || d.data || d.insights || [];
        }
        return [];
      };

      setHotNotes(extractData(hn));
      setForgottenNotes(extractData(fn));
      setHotEntities(extractData(he));
      setForgottenEntities(extractData(fe));
    } catch (err) {
      toast({ title: t("db_toastInsightsFailTitle"), description: t("db_toastTryAgain"), variant: "destructive" });
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
      const res = await authApi.exportVaultZip();
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-vault.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: t("db_toastExportReadyTitle"), description: t("db_toastExportReadyDesc") });
    } catch (e) {
      console.error("Export failed", e);
      toast({ title: t("db_toastExportFailedTitle"), description: t("db_toastTryAgain"), variant: "destructive" });
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

  const {
    data: scoreTimeline,
    isLoading: scoreTimelineLoading,
    isFetching: scoreTimelineFetching,
    isError: scoreTimelineError,
    refetch: refetchScoreTimeline,
  } = useQuery({
    queryKey: ["metrics", "scoreTimeline"],
    queryFn: () => metricsApi.scoreTimeline().then((r) => r.data),
    retry: 1,
    staleTime: 60_000,
  });

  const { data: vaultFiles } = useQuery({
    queryKey: ["vault", "files"],
    queryFn: () => vaultApi.list().then((r) => r.data),
  });

  const vaultFilesList = useMemo(() => {
    if (Array.isArray(vaultFiles)) return vaultFiles;
    if (vaultFiles && typeof vaultFiles === 'object') {
      return (vaultFiles as any).files || (vaultFiles as any).data || (vaultFiles as any).content || [];
    }
    return [];
  }, [vaultFiles]);

  const vaultUsedMB = useMemo(() => {
    return vaultFilesList.reduce((t: number, f: any) => t + (f?.size ?? 0) / (1024 * 1024), 0) ?? 0;
  }, [vaultFilesList]);

  const vaultMaxMB = limits.maxVaultSizeMB;
  const storageUsed = `${vaultUsedMB.toFixed(1)} MB`;
  const storageLimit = isUnlimited(vaultMaxMB) ? "∞" : `${vaultMaxMB} MB`;

  useEffect(() => {
    if (vaultFilesList == null || usage == null || vaultFilesList.length === 0) return;
    const storageMB = Number(vaultUsedMB.toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [vaultFilesList, vaultUsedMB, usage, applyUsageDelta]);

  const recentNotes = useMemo(() => {
    const summaryNotes = summary?.recentNotes || (summary && typeof summary === 'object' ? ((summary as any).notes || (summary as any).data) : null);
    if (Array.isArray(summaryNotes) && summaryNotes.length > 0) {
      return summaryNotes.slice(0, 6);
    }
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (!Array.isArray(notesList) || notesList.length === 0) return [];
    return [...notesList]
      .filter((note: any) => note && (note.createdAt || note.updatedAt))
      .sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt || note.updatedAt).getTime(),
      }));
  }, [summary, notes]);

  const graphNodeCount = useMemo(() => {
    if (graphData?.nodes) return graphData.nodes.length;
    if (Array.isArray(graphData)) return graphData.length;
    if (graphData && typeof graphData === 'object') return (graphData as any).totalNodes || (graphData as any).count || 0;
    return 0;
  }, [graphData]);

  const totalNotes = useMemo(() => {
    if (summary?.stats?.totalNotes !== undefined) return summary.stats.totalNotes;
    if ((summary as any)?.totalNotes !== undefined) return (summary as any).totalNotes;
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (Array.isArray(notesList)) return notesList.length;
    return 0;
  }, [summary, notes]);

  const totalEntities = useMemo(() => {
    if (summary?.stats?.totalEntities !== undefined) return summary.stats.totalEntities;
    if ((summary as any)?.totalEntities !== undefined) return (summary as any).totalEntities;
    return 0;
  }, [summary]);

  const { currentScore, fullHistory } = useMemo(() => {
    const rawHistory = Array.isArray(scoreTimeline)
      ? scoreTimeline
      : scoreTimeline && typeof scoreTimeline === "object"
        ? ((scoreTimeline as any).history ?? (scoreTimeline as any).timeline ?? (scoreTimeline as any).points ?? (scoreTimeline as any).data ?? [])
        : [];

    const normalized = rawHistory.reduce((acc: any[], point: any) => {
      if (!point?.date) return acc;
      const scoreValue = point.score !== undefined ? Number(point.score) : Number(point.value ?? 0);
      const dateStr = String(point.date).includes("T") ? point.date : `${point.date}T00:00:00`;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime()) && !Number.isNaN(scoreValue)) {
        acc.push({
          date: String(point.date).slice(0, 10),
          ts: date.getTime(),
          score: Number(scoreValue.toFixed(2)),
        });
      }
      return acc;
    }, [] as Array<{ date: string; ts: number; score: number }>);

    normalized.sort((a, b) => a.ts - b.ts);

    return {
      currentScore: normalized.length > 0 ? normalized[normalized.length - 1].score : 0,
      fullHistory: normalized,
    };
  }, [scoreTimeline]);

  // Local filtering by selected time range.
  const scoreTimelineData = useMemo(() => {
    const days = rangeDaysMap[timeRange];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a lookup of existing scores keyed by YYYY-MM-DD.
    const byDate = new Map<string, number>();
    fullHistory.forEach((p) => byDate.set(p.date, p.score));

    // "total" → span from earliest known date (or today) up to today.
    let spanDays = days;
    if (timeRange === "total") {
      const earliest = fullHistory[0]?.ts ?? today.getTime();
      const diff = Math.ceil((today.getTime() - earliest) / (24 * 60 * 60 * 1000)) + 1;
      spanDays = Math.max(diff, 14);
    }

    // Hard cap on point count to keep the chart readable.
    const MAX_POINTS = 365;
    const step = Math.max(1, Math.ceil(spanDays / MAX_POINTS));

    const points: Array<{ date: string; ts: number; score: number; label: string }> = [];
    for (let i = spanDays - 1; i >= 0; i -= step) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      points.push({
        date: key,
        ts: d.getTime(),
        score: byDate.get(key) ?? 0,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return points;
  }, [fullHistory, timeRange]);

  const scoreStats = useMemo(() => {
    const values = scoreTimelineData.map((p: any) => p.score);
    const max = Math.max(...values, 0.1);
    const hasData = scoreTimelineData.some((p: any) => p.score > 0);
    return { current: currentScore, max, hasData };
  }, [scoreTimelineData, currentScore]);

  if (summaryLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("db_goodMorning");
    if (hour < 18) return t("db_goodAfternoon");
    return t("db_goodEvening");
  })();
  const displayName = user?.username || user?.email?.split("@")[0] || t("db_there");

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="border-b border-white/10 pb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">{t("db_overview")}</p>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl tracking-tight text-white">
              {greeting}, {displayName}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {t("db_subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <Button size="sm" variant="outline" onClick={() => navigate("/activities")} className="gap-1 h-7 px-2.5 text-[11px]">
              <Flame className="h-3 w-3" />
              {t("db_activities")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/projects")} className="gap-1 h-7 px-2.5 text-[11px]">
              <Clock className="h-3 w-3" />
              {t("db_project")}
            </Button>
            <Button size="sm" onClick={() => void createNote()} disabled={creating} className="gap-1 h-7 px-2.5 text-[11px]">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {creating ? t("db_creating") : t("db_newNote")}
            </Button>
          </div>


        </header>


        {/* WEEKLY SUMMARY */}
        <WeeklySummary
          notes={Array.isArray(notes) ? notes : []}
          totalNotes={totalNotes}
          totalEntities={totalEntities}
          graphNodeCount={graphNodeCount}
          currentScore={currentScore}
        />


        {/* CORPO DO DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* BLOCO 1: PERFORMANCE & METRICS */}
          <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4 sm:p-6 lg:col-span-8 flex flex-col justify-between">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">{t("db_signal")}</p>
                    <h2 className="mt-1 font-serif text-2xl text-white">{t("db_scoreEvolution")}</h2>
                    <p className="mt-1 text-xs text-white/50">{t("db_scoreEvolutionSubtitle")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">{t("db_current")}</p>
                    <p className="font-mono text-2xl text-white tabular-nums leading-none mt-1">
                      {scoreStats.current.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => refetchScoreTimeline()}
                    disabled={scoreTimelineFetching}
                    className="hidden sm:inline-flex gap-1 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", scoreTimelineFetching && "animate-spin")} />
                    {t("db_score")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => navigate("/insights")}
                    className="hidden sm:inline-flex text-xs text-white/50 hover:text-white transition-colors"
                  >
                    {t("db_insightsArrow")}
                  </Button>
                </div>
              </div>

              {/* BARRA SELETORA DE PERÍODO */}
              <div className="flex items-center -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none gap-1 border-y sm:border border-white/5 sm:rounded-sm bg-white/[0.01] p-1">
                {(Object.keys(rangeDaysMap) as TimeRange[]).map((range) => {
                  const labels: Record<TimeRange, string> = {
                    "14d": t("db_range14d"),
                    "1mo": t("db_range1mo"),
                    "3mo": t("db_range3mo"),
                    "6mo": t("db_range6mo"),
                    "1y": t("db_range1y"),
                    "total": t("db_rangeTotal")
                  };
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors shrink-0",
                        timeRange === range
                          ? "bg-white/[0.06] text-white"
                          : "text-white/40 hover:text-white/70"
                      )}
                    >
                      {labels[range]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-[200px] sm:h-[250px] w-full -mx-2 relative">
              {scoreTimelineLoading && scoreTimelineData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                  {t("db_loadingScoreHistory")}
                </div>
              ) : !scoreStats.hasData ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4">
                  <p className="text-xs text-white/40">{t("db_noScoreHistory")}</p>
                  <p className="text-[11px] text-white/30">{t("db_noScoreHistoryHint")}</p>
                </div>
              ) : (
                <>
                  {/* Alerta visual de falha na sincronização */}
                  {scoreTimelineError && (
                    <div className="absolute right-2 top-1 z-10 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                      {t("db_failedSyncScore")}
                    </div>
                  )}
                  <ChartContainer config={{}} className="h-full w-full">
                    <AreaChart data={scoreTimelineData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.22} />
                          <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--foreground) / 0.04)" strokeDasharray="2 6" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickMargin={8}
                        minTickGap={32}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 1)]}
                        tickFormatter={(value) => Number(value).toFixed(0)}
                        width={32}
                        tickCount={4}
                      />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--foreground) / 0.2)", strokeWidth: 1, strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 11,
                          color: "hsl(var(--foreground))",
                          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.6)",
                          padding: "8px 10px",
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10, marginBottom: 4 }}
                        labelFormatter={(_label, payload) => {
                          const ts = (payload?.[0]?.payload as any)?.ts;
                          if (!ts) return _label as string;
                          return new Date(ts).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        }}
                        formatter={(value) => [Number(value as number).toFixed(2), t("db_score")]}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1.75}
                        fill="url(#scoreFill)"
                        dot={false}
                        activeDot={{ r: 4, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                        isAnimationActive
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ChartContainer>
                </>
              )}
            </div>
          </div>

          {/* PLAN USAGE CARD */}
          <div className="hidden border border-white/5 bg-white/[0.01] rounded-sm p-4 sm:p-6 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">{t("db_account")}</p>
                  <h2 className="mt-1 font-serif text-2xl text-white">{t("db_planLimits")}</h2>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/70 border border-white/10 px-2 py-1 rounded-sm">
                  {user?.plan || t("db_free")}
                </span>
              </div>

              {usage ? (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{t("db_notes")}</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">
                        {usage.notesCount} / {isUnlimited(limits.maxNotes) ? "∞" : limits.maxNotes}
                      </span>
                    </div>
                    <Progress value={isUnlimited(limits.maxNotes) ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{t("db_entities")}</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">
                        {usage.entitiesCount} / {isUnlimited(limits.maxEntities) ? "∞" : limits.maxEntities}
                      </span>
                    </div>
                    <Progress value={isUnlimited(limits.maxEntities) ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{t("db_stream")}</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">{storageUsed} / {storageLimit}</span>
                    </div>
                    <Progress value={isUnlimited(limits.maxVaultSizeMB) ? 0 : Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-white/40">{t("db_loadingUsage")}</div>
              )}

              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 text-[11px]">
                <div className="grid gap-3 grid-cols-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-neutral-500 text-[9px] uppercase font-semibold tracking-wider">{t("db_historyRetention")}</span>
                    <span className="text-neutral-300 font-medium">{isUnlimited(limits.historyDays) ? t("db_unlimited") : t("db_daysUnit", { n: limits.historyDays })}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-neutral-500 text-[9px] uppercase font-semibold tracking-wider">{t("db_metadataLimit")}</span>
                    <span className="text-neutral-300 font-medium">{isUnlimited(limits.maxMetadataSizeKb) ? t("db_unlimited") : t("db_kbUnit", { n: limits.maxMetadataSizeKb })}</span>
                  </div>
                  <div className="flex items-center justify-between col-span-2 pt-2.5 border-t border-white/5 mt-0.5 text-neutral-400">
                    <span>{t("db_dataExport")}</span>
                    {user?.dataExport ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="text-neutral-200 underline-offset-4 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {exporting ? t("db_exporting") : t("db_downloadBackup")}
                      </Button>
                    ) : (
                      <span className="text-neutral-600 text-[10px]">{t("db_upgradeRequired")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/subscription")}
              className="mt-4 self-start"
            >
              {t("db_manageSubscription")}
            </Button>
          </div>

          {/* BLOCO 2: WORKSPACE ACTIVITY */}
          {/* RECENT NOTES CARD */}
          <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4 sm:p-6 lg:col-span-4 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">{t("db_stream")}</p>
                <h2 className="mt-1 font-serif text-xl text-white">{t("db_recentNotes")}</h2>
              </div>
              <button type="button" onClick={() => navigate("/notes")} className="text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                {t("db_viewAll")}
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[280px] sm:max-h-[310px] pr-1 scrollbar-thin">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:bg-neutral-900/50 hover:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs sm:text-sm font-medium text-white/80 group-hover:text-white truncate">{note.title || t("db_untitled")}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-white/30 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50" />
                    </div>
                    <p className="mt-0.5 text-[9px] font-mono text-white/40">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-white/30 h-full flex items-center justify-center">
                  {t("db_noRecentNotes")}
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS: HOT RIGHT NOW */}
          <DashboardInsightSection
            title={t("db_hotRightNow")}
            subtitle={t("db_hotRightNowSubtitle")}
            icon={Flame}
            loading={insightsLoading}
            empty={hotNotes.length === 0}
            className="lg:col-span-8"
            gridColsClass="grid-cols-1 sm:grid-cols-2"
            onRefresh={() => loadInsights(true)}
            refreshing={refreshingInsights}
            viewMoreHref="/notes"
            viewMoreLabel={t("db_viewAllNotes")}
          >
            {hotNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* BLOCO 3: GRAPH DISCOVERY */}
          {/* INSIGHTS: KEY PEOPLE & PROJECTS */}
          <DashboardInsightSection
            title={t("db_keyPeopleProjects")}
            subtitle={t("db_keyPeopleProjectsSubtitle")}
            icon={Users}
            loading={insightsLoading}
            empty={hotEntities.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/entities"
            viewMoreLabel={t("db_viewAllEntities")}
          >
            {hotEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: WORTH REVISITING */}
          <DashboardInsightSection
            title={t("db_worthRevisiting")}
            subtitle={t("db_worthRevisitingSubtitle")}
            icon={Clock}
            loading={insightsLoading}
            empty={forgottenNotes.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/notes"
            viewMoreLabel={t("db_viewAllNotes")}
          >
            {forgottenNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: FORGOTTEN GEMS */}
          <DashboardInsightSection
            title={t("db_forgottenGems")}
            subtitle={t("db_forgottenGemsSubtitle")}
            icon={TrendingUp}
            loading={insightsLoading}
            empty={forgottenEntities.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/entities"
            viewMoreLabel={t("db_viewAllEntities")}
          >
            {forgottenEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

        </section>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={t("db_notesLimitReason")} />
      
      {/* Onboarding popup after account creation */}
      <Dialog open={showOnboardingPopup} onOpenChange={setShowOnboardingPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{t("db_welcomeTitle")}</DialogTitle>
            <DialogDescription className="mt-2">
              {t("db_welcomeDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground/80">
              {t("db_welcomeParagraphPart1")} <span className="font-semibold">{t("db_welcomeParagraphMarkdown")}</span> {t("db_welcomeParagraphPart2")}
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-white/50 mb-2">{t("db_importSupportsLabel")}</p>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• {t("db_importSupport1")}</li>
                <li>• {t("db_importSupport2")}</li>
                <li>• {t("db_importSupport3")}</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnboardingPopup(false)}
              className="flex-1"
            >
              {t("db_gotIt")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowOnboardingPopup(false);
                navigate("/notes");
              }}
              className="flex-1"
            >
              {t("db_importNotesArrow")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>

  );
}
