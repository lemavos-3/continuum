import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateEntityDialog } from "@/components/CreateEntityDialog";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { EntityType } from "@/types";

interface Entity {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  createdAt: string;
  trackingDates?: string[];
}

const typeLabels: Record<string, string> = {
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
  ACTIVITY: "Activity",
};

const types = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "ACTIVITY"];

/* ── Helpers ──────────────────────────────────────────────────────────── */

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "today";
  if (diff < day * 2) return "yesterday";
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  if (diff < day * 30) return `${Math.floor(diff / (day * 7))}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Sidebar nav item ─────────────────────────────────────────────────── */

interface NavItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function NavItem({ label, count, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "text-white" : "text-white/45 hover:text-white/80"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-px w-3 transition-all",
            active ? "bg-white w-5" : "bg-white/20 group-hover:bg-white/40"
          )}
        />
        {label}
      </span>
      <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-white/60" : "text-white/30")}>
        {count}
      </span>
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Entities() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshUsage, applyUsageDelta } = usePlanGate();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingDeleteEntity, setPendingDeleteEntity] = useState<Entity | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Controle de Swipe Lateral para Mobile
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t.clientX > 32) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    if (dx > 60 && dy < 60 && Date.now() - s.t < 600) setFilterDrawerOpen(true);
    swipeRef.current = null;
  };

  /* Carregar Dados */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await entitiesApi.list();
        if (!cancelled) setEntities(Array.isArray(res.data) ? (res.data as Entity[]) : []);
      } catch {
        if (!cancelled) toast({ title: "Could not load entities", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  /* Deletar */
  const handleDelete = (e: React.MouseEvent, entity: Entity) => {
    e.stopPropagation();
    setPendingDeleteEntity(entity);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteEntity) return;
    try {
      await entitiesApi.delete(pendingDeleteEntity.id);
      setEntities((prev) => prev.filter((x) => x.id !== pendingDeleteEntity.id));
      applyUsageDelta({ entitiesCount: -1, activitiesCount: pendingDeleteEntity.type === "ACTIVITY" ? -1 : 0 });
      void refreshUsage();
    } catch {
      toast({ title: "Error deleting entity", variant: "destructive" });
    } finally {
      setPendingDeleteEntity(null);
    }
  };

  /* Contadores da Barra Lateral */
  const counts = useMemo(() => {
    return {
      all: entities.length,
      byType: types.reduce<Record<string, number>>((acc, t) => {
        acc[t] = entities.filter((e) => e.type === t).length;
        return acc;
      }, {}),
    };
  }, [entities]);

  /* Filtragem e Ordenação */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities
      .filter((e) => {
        if (selectedType && e.type !== selectedType) return false;
        if (q) {
          const hay = `${e.title} ${e.description || ""} ${typeLabels[e.type] || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entities, selectedType, search]);

  /* Agrupamento Mensal */
  const grouped = useMemo(() => {
    const map = new Map<string, Entity[]>();
    for (const e of filtered) {
      const key = monthKey(new Date(e.createdAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const viewLabel = selectedType ? typeLabels[selectedType] : "All Atoms";

  const SidebarContent = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">Index</p>
        <div className="space-y-0.5">
          <NavItem
            label="All entities"
            count={counts.all}
            active={!selectedType}
            onClick={() => { setSelectedType(null); setFilterDrawerOpen(false); }}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">Types</p>
        <div className="space-y-0.5">
          {types.map((t) => (
            <NavItem
              key={t}
              label={typeLabels[t]}
              count={counts.byType[t] || 0}
              active={selectedType === t}
              onClick={() => { setSelectedType(t); setFilterDrawerOpen(false); }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div
        className="relative min-h-full"
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >
        {/* Indicador visual lateral para mobile */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-1/2 z-20 hidden h-24 w-[3px] -translate-y-1/2 rounded-r bg-white/15 max-lg:block"
        />

        {/* Menu Lateral Mobile */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-white/10 bg-black/95 p-6">
            <p className="mb-6 font-serif text-2xl text-white">Filters</p>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:sticky lg:top-16 lg:block lg:w-52 lg:shrink-0 lg:self-start">
            {SidebarContent}
          </aside>

          {/* Conteúdo Principal */}
          <main className="min-w-0 flex-1">
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{viewLabel}</p>
                  <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">Entities</h1>
                  <p className="mt-2 text-sm text-white/50">
                    The atoms of your knowledge graph.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setFilterDrawerOpen(true)}
                    className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white lg:hidden"
                    aria-label="Open filters"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 h-9 px-4 rounded-sm text-sm">
                    <Plus className="h-3.5 w-3.5" /> New entity
                  </button>
                </div>
              </div>
            </header>

            {/* Input de Busca Fixo */}
            <div className="sticky top-14 z-10 -mx-4 mb-10 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, type or description…"
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Listagem */}
            {loading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif text-2xl italic text-white/40">
                  {search ? "Nothing matches that search." : "No entities yet. Create your first one."}
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {grouped.map(([key, items]) => {
                  const collapsed = collapsedMonths.has(key);
                  return (
                    <section key={key}>
                      <button
                        onClick={() => toggleMonth(key)}
                        className="group mb-5 flex w-full items-center justify-between border-b border-white/10 pb-2 text-left"
                      >
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40 group-hover:text-white/70">
                          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {formatMonth(key)}
                        </span>
                        <span className="font-mono text-[10px] text-white/30 tabular-nums">
                          {items.length} {items.length === 1 ? "atom" : "atoms"}
                        </span>
                      </button>

                      {!collapsed && (
                        <ul className="divide-y divide-white/[0.06]">
                          {items.map((entity) => (
                            <li key={entity.id}>
                              <button
                                onClick={() => navigate(`/entities/${entity.id}`)}
                                className="group relative flex w-full items-start gap-4 py-5 text-left transition-colors hover:bg-white/[0.02]"
                              >
                                {/* Linha de realce no Hover */}
                                <span
                                  aria-hidden
                                  className="absolute left-0 top-1/2 h-8 w-px -translate-x-3 -translate-y-1/2 bg-white opacity-0 transition-opacity group-hover:opacity-100"
                                />

                                {/* Coluna da Data */}
                                <div className="hidden w-20 shrink-0 pt-1 sm:block">
                                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                                    {relativeDate(entity.createdAt)}
                                  </p>
                                </div>

                                {/* Conteúdo da Entidade */}
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-serif text-xl leading-snug text-white/90 transition-colors group-hover:text-white">
                                    {entity.title || "Untitled"}
                                  </h3>
                                  {entity.description && (
                                    <p className="mt-1 line-clamp-1 text-sm text-white/45">{entity.description}</p>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/35">
                                    <span className="uppercase tracking-[0.18em]">
                                      {typeLabels[entity.type] ?? entity.type}
                                    </span>
                                    <span className="sm:hidden">{relativeDate(entity.createdAt)}</span>
                                  </div>
                                </div>

                                {/* Ações de Deleção no Hover */}
                                <div className="flex shrink-0 items-center gap-1 pt-1">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => handleDelete(e, entity)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleDelete(e as unknown as React.MouseEvent, entity);
                                      }
                                    }}
                                    className="cursor-pointer rounded-sm p-1.5 text-white/20 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
                                    aria-label="Delete entity"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      <CreateEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={(selectedType as EntityType) || "TOPIC"}
        onCreated={(entity) => setEntities((prev) => [...prev, entity as Entity])}
      />
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="You've reached the entities limit for your plan."
      />
      <ConfirmDialog
        open={!!pendingDeleteEntity}
        onOpenChange={(open) => !open && setPendingDeleteEntity(null)}
        title="Delete entity?"
        description={
          pendingDeleteEntity
            ? `${pendingDeleteEntity.title || "Untitled"} will be permanently removed.`
            : "This action cannot be undone."
        }
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}