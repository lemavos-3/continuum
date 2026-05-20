import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
  StickyNote,
  Network,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  if (b.includes("hot")) return "bg-orange-500/15 text-orange-300 border-orange-500/30";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-violet-500/15 text-violet-300 border-violet-500/30";
  if (b.includes("key")) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (b.includes("high")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-white/5 text-zinc-300 border-white/10";
};

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] text-zinc-400">
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
        "group relative flex w-[260px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-4 text-left",
        "backdrop-blur-xl transition-colors hover:border-white/15 hover:bg-white/[0.05]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[10px] font-medium", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[10px] text-zinc-500">{item.score.toFixed(1)}</span>
      </div>

      <div className="flex items-start gap-2">
        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{item.note.title || "Untitled"}</h3>
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5">
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
        "group relative flex w-[260px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-4 text-left",
        "backdrop-blur-xl transition-colors hover:border-white/15 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[10px] font-medium", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[10px] text-zinc-500">{item.score.toFixed(1)}</span>
      </div>

      <div className="flex items-start gap-2">
        <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">{item.entity.title}</h3>
          {item.entity.type && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{item.entity.type}</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} mentions</StatChip>}
        {item.relationsCount > 0 && <StatChip>{item.relationsCount} relations</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)} tracked</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastMention)}</StatChip>
      </div>
    </motion.button>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
  empty,
  loading,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
  empty: boolean;
  loading: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg border", accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden px-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[148px] w-[260px] shrink-0 animate-pulse rounded-xl border border-white/8 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : empty ? (
        <div className="mx-1 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-zinc-500">
          Nothing here yet — keep journaling and connecting entities.
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-3 px-1 pb-3">{children}</div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
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

  const totalSignal =
    hotNotes.length + forgottenNotes.length + hotEntities.length + forgottenEntities.length;

  const topScore = Math.max(
    0,
    ...hotNotes.map((n) => n.score),
    ...hotEntities.map((e) => e.score),
  );

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 lg:pb-10">
        {/* Header */}
        <header className="mb-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Insights
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                What's worth your attention
              </h1>
              <p className="max-w-xl text-sm text-zinc-400">
                Surface notes and entities that matter most — so nothing important gets buried.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
              className="h-9 w-9 shrink-0 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Signals</div>
              <div className="mt-1 text-lg font-semibold text-white">{totalSignal}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Top score</div>
              <div className="mt-1 text-lg font-semibold text-white">{topScore.toFixed(1)}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Revisit</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {forgottenNotes.length + forgottenEntities.length}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <Section
            title="Hot right now"
            subtitle="Notes with the strongest recent gravity"
            icon={Flame}
            accent="border-orange-500/30 bg-orange-500/10 text-orange-300"
            loading={loading}
            empty={hotNotes.length === 0}
          >
            {hotNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </Section>

          <Section
            title="Key people & projects"
            subtitle="Entities that show up everywhere lately"
            icon={Users}
            accent="border-blue-500/30 bg-blue-500/10 text-blue-300"
            loading={loading}
            empty={hotEntities.length === 0}
          >
            {hotEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </Section>

          <Section
            title="Worth revisiting"
            subtitle="High-value notes you haven't touched in a while"
            icon={Clock}
            accent="border-violet-500/30 bg-violet-500/10 text-violet-300"
            loading={loading}
            empty={forgottenNotes.length === 0}
          >
            {forgottenNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </Section>

          <Section
            title="Forgotten gems"
            subtitle="Entities that once mattered — bring them back"
            icon={TrendingUp}
            accent="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            loading={loading}
            empty={forgottenEntities.length === 0}
          >
            {forgottenEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </Section>

          {!loading && totalSignal === 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
              <Sparkles className="mx-auto h-6 w-6 text-zinc-500" />
              <h3 className="mt-3 text-base font-semibold text-white">No insights yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
                Insights appear as you create notes, mention people/projects, and track time.
              </p>
              <Button
                onClick={() => navigate("/notes")}
                className="mt-4 bg-white text-black hover:bg-white/90"
              >
                Open Notes <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
