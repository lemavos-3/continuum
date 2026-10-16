import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Sparkles } from "@/lib/heroicons";
import { notesApi } from "@/lib/api";
import { qk } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCachedResource } from "@/hooks/useCachedResource";

const COPY = {
  en: { capture: "Quick capture", captureDesc: "Write it down now. The first line becomes the title.", placeholder: "An idea, a task, a thought…", save: "Save", saved: "Captured", review: "Weekly review", reviewDesc: "Your last 7 days at a glance.", notes: "New notes", habits: "Habit check-ins", projects: "Active projects", forgotten: "Forgotten topics", none: "Nothing here.", failed: "Could not save" },
  pt: { capture: "Captura rápida", captureDesc: "Anote agora. A primeira linha vira o título.", placeholder: "Uma ideia, tarefa, pensamento…", save: "Salvar", saved: "Capturado", review: "Revisão semanal", reviewDesc: "Seus últimos 7 dias num relance.", notes: "Notas novas", habits: "Check-ins de hábitos", projects: "Projetos ativos", forgotten: "Tópicos esquecidos", none: "Nada aqui.", failed: "Não foi possível salvar" },
  es: { capture: "Captura rápida", captureDesc: "Anótalo ahora. La primera línea será el título.", placeholder: "Una idea, tarea, pensamiento…", save: "Guardar", saved: "Capturado", review: "Revisión semanal", reviewDesc: "Tus últimos 7 días de un vistazo.", notes: "Notas nuevas", habits: "Registros de hábitos", projects: "Proyectos activos", forgotten: "Temas olvidados", none: "Nada aquí.", failed: "No se pudo guardar" },
  fr: { capture: "Capture rapide", captureDesc: "Notez-le maintenant. La première ligne devient le titre.", placeholder: "Une idée, une tâche, une pensée…", save: "Enregistrer", saved: "Capturé", review: "Bilan hebdo", reviewDesc: "Vos 7 derniers jours en un coup d'œil.", notes: "Nouvelles notes", habits: "Habitudes cochées", projects: "Projets actifs", forgotten: "Sujets oubliés", none: "Rien ici.", failed: "Échec de l'enregistrement" },
};

const WEEK = 7 * 86400000;

export function QuickCapture() {
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY)] ?? COPY.en;
  const [mode, setMode] = useState<null | "capture" | "review">(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); setMode("capture"); }
      if (k === "y") { e.preventDefault(); setMode("review"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const save = async () => {
    const value = text.trim();
    if (!value || saving) return;
    setSaving(true);
    const [first, ...rest] = value.split("\n");
    try {
      await notesApi.create(first.slice(0, 120), rest.join("\n").trim() || first);
      void qc.invalidateQueries({ queryKey: qk.notes() });
      toast({ title: c.saved });
      setText("");
      setMode(null);
    } catch {
      toast({ title: c.failed, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2 lg:bottom-6">
        <button aria-label={c.review} title={`${c.review} (Ctrl+Shift+Y)`} onClick={() => setMode("review")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card/80 text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground">
          <Sparkles className="h-4 w-4" />
        </button>
        <button aria-label={c.capture} title={`${c.capture} (Ctrl+Shift+N)`} onClick={() => setMode("capture")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90">
          <Zap className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={mode === "capture"} onOpenChange={o => !o && setMode(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{c.capture}</DialogTitle>
            <DialogDescription>{c.captureDesc}</DialogDescription>
          </DialogHeader>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={c.placeholder} rows={5}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(); } }}
            className="w-full resize-none rounded-2xl bg-muted/50 p-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <Button onClick={save} disabled={!text.trim() || saving} className="rounded-full">{c.save}</Button>
        </DialogContent>
      </Dialog>

      {mode === "review" && <WeeklyReview c={c} onClose={() => setMode(null)} onOpen={(p) => { setMode(null); navigate(p); }} />}
    </>
  );
}

function WeeklyReview({ c, onClose, onOpen }: { c: typeof COPY.en; onClose: () => void; onOpen: (path: string) => void }) {
  const notes = useCachedResource<any[]>(qk.notes(), async () => (await notesApi.list()).data as any[]);
  const entities = useCachedResource<any[]>(qk.entities(), async () => {
    const { entitiesApi } = await import("@/lib/api");
    return (await entitiesApi.list()).data as any[];
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const inWeek = (d?: string) => !!d && now - new Date(d).getTime() <= WEEK;
    const n = notes.data ?? [];
    const e = entities.data ?? [];
    const habits = e.filter(x => x.type === "ACTIVITY").reduce((s, x) => s + (x.trackingDates ?? []).filter(inWeek).length, 0);
    const projects = e.filter(x => x.type === "PROJECT" && (x.trackingDates ?? []).some(inWeek));
    const forgotten = n
      .filter(x => x.updatedAt && now - new Date(x.updatedAt).getTime() > 30 * 86400000)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, 5);
    return { newNotes: n.filter(x => inWeek(x.createdAt)).length, habits, projects, forgotten };
  }, [notes.data, entities.data]);

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{c.review}</DialogTitle>
          <DialogDescription>{c.reviewDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[[c.notes, stats.newNotes], [c.habits, stats.habits], [c.projects, stats.projects.length]].map(([label, v]) => (
            <div key={label as string} className="rounded-2xl bg-muted/50 p-3">
              <div className="text-2xl font-semibold text-foreground">{v}</div>
              <div className="label-caps text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        {stats.projects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.projects.map(p => (
              <button key={p.id} onClick={() => onOpen(`/entities/${p.id}`)} className="rounded-full bg-muted px-3 py-1 text-xs text-foreground hover:bg-muted/70">{p.title}</button>
            ))}
          </div>
        )}
        <div>
          <div className="label-caps mb-2 text-muted-foreground">{c.forgotten}</div>
          {stats.forgotten.length === 0 ? <p className="text-sm italic text-muted-foreground">{c.none}</p> : (
            <ul className="divide-y divide-border/10">
              {stats.forgotten.map(n => (
                <li key={n.id}>
                  <button onClick={() => onOpen(`/notes/${n.id}`)} className="w-full rounded-xl px-2 py-2 text-left text-sm text-foreground hover:bg-foreground/[0.04]">{n.title || "Untitled"}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
