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

function StatChip({ children }: { children: React.ReactNode }) {
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
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl border shadow-inner", accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 px-1 py-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[148px] w-full animate-pulse rounded-2xl border border-white/5 bg-neutral-900/20 backdrop-blur-md"
            />
          ))}
        </div>
      ) : empty ? (
        <div className="mx-1 rounded-2xl border border-dashed border-white/5 bg-neutral-900/5 p-8 text-center text-xs text-neutral-500 backdrop-blur-sm">
          Nothing here yet — keep journaling and connecting entities.
        </div>
      ) : (
        <div className="space-y-4 px-1 pb-4">{children}</div>
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
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="border-b border-white/5 pb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold">Signals</p>
            </div>
            <h1 className="font-serif text-4xl tracking-tight text-neutral-100">Insights</h1>
            <p className="text-xs text-neutral-500 mt-1">
              Surface notes and entities that matter most — so nothing important gets buried.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="h-9 border-white/5 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-900/80 hover:text-white rounded-xl shadow-md transition-all gap-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline text-xs font-medium">Refresh</span>
          </Button>
        </header>

        {/* QUICK STATS */}
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 shadow-inner flex flex-col gap-1 transition-colors hover:border-white/10">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Signals</span>
            <span className="text-2xl font-semibold text-neutral-100 tabular-nums">{totalSignal}</span>
          </div>
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 shadow-inner flex flex-col gap-1 transition-colors hover:border-white/10">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Top score</span>
            <span className="text-2xl font-semibold text-neutral-100 tabular-nums">{topScore.toFixed(1)}</span>
          </div>
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 shadow-inner flex flex-col gap-1 transition-colors hover:border-white/10">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Revisit</span>
            <span className="text-2xl font-semibold text-neutral-100 tabular-nums">
              {forgottenNotes.length + forgottenEntities.length}
            </span>
          </div>
        </div>

        <div className="space-y-10">
          <Section
            title="Hot right now"
            subtitle="Notes with the strongest recent gravity"
            icon={Flame}
            accent="border-orange-500/20 bg-orange-500/10 text-orange-400"
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
            accent="border-blue-500/20 bg-blue-500/10 text-blue-400"
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
            accent="border-violet-500/20 bg-violet-500/10 text-violet-400"
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
            accent="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            loading={loading}
            empty={forgottenEntities.length === 0}
          >
            {forgottenEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </Section>

          {!loading && totalSignal === 0 && (
            <div className="rounded-3xl border border-dashed border-white/5 bg-neutral-900/5 p-12 text-center backdrop-blur-sm">
              <div className="h-12 w-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-5 w-5 text-neutral-500" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-200">No insights yet</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs text-neutral-500 leading-relaxed">
                Insights automatically appear as you create notes, mention people and projects, and track time inside the network.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/notes")}
                className="mt-6 border-white/5 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/80 hover:text-white rounded-xl h-9 transition-all shadow-md"
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
