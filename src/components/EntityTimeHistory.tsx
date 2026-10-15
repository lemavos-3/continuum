import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import { useTimeTracking, type TimeEntry } from '@/hooks/useTimeTracking';
import { X, Loader2, Edit as Pencil, Check } from '@/lib/heroicons';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  entityId: string;
}

/** Compact human-friendly duration: 2h 15m, 45m, 30s. */
function fmtCompact(s: number) {
  s = Math.max(0, Math.floor(s));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtClock(s: number) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Per-entity history of time entries with simple stats.
 */
export function EntityTimeHistory({ entityId }: Props) {
  const { t } = useLanguage();
  const { deleteEntry, updateEntry } = useTimeTracking();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMin, setEditMin] = useState('');
  const saveEdit = async (id: string) => {
    const secs = Math.round(parseFloat(editMin) * 60);
    if (!secs || secs <= 0) return;
    try { await updateEntry({ entryId: id, durationSeconds: secs }); toast({ title: t('tm_duration_updated') }); setEditingId(null); }
    catch { toast({ title: t('ent_error'), variant: 'destructive' }); }
  };
  const [page, setPage] = useState(1);
  const PAGE = 8;

  const { data, isLoading } = useQuery({
    queryKey: ['timeTracking', 'entries', entityId],
    queryFn: () => {
      const from = new Date();
      from.setDate(from.getDate() - 365);
      return timeTrackingApi
        .getTimeInRange(
          entityId,
          from.toISOString().slice(0, 10),
          new Date().toISOString().slice(0, 10),
        )
        .then((r) => r.data as TimeEntry[]);
    },
  });

  const entries = useMemo(
    () =>
      [...(data || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [data],
  );

  const stats = useMemo(() => {
    const total = entries.reduce((a, e) => a + (e.durationSeconds || 0), 0);
    const avg = entries.length ? Math.round(total / entries.length) : 0;
    const longest = entries.reduce((m, e) => Math.max(m, e.durationSeconds || 0), 0);
    return { total, avg, longest, count: entries.length };
  }, [entries]);

  const pageEntries = entries.slice(0, page * PAGE);

  return (
    <div className="rounded-xl border border-border/10 bg-foreground/[0.02] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{t('tm_time_history')}</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label={t('tm_total')} value={fmtCompact(stats.total)} />
        <Stat label={t('tm_avg_cap')} value={fmtCompact(stats.avg)} />
        <Stat label={t('tm_longest')} value={fmtCompact(stats.longest)} />
        <Stat label={t('tm_entries_cap')} value={String(stats.count)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('tm_no_entries_yet')}</p>
      ) : (
        <ul className="divide-y divide-border/10">
          {pageEntries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">{e.date}</span>
              {editingId === e.id ? (
                <input
                  type="number" min={1} step={1} autoFocus value={editMin}
                  aria-label={t('tm_edit_duration')} title={t('tm_edit_duration')}
                  onChange={(ev) => setEditMin(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') saveEdit(e.id); if (ev.key === 'Escape') setEditingId(null); }}
                  className="w-24 shrink-0 rounded-sm border border-border/20 bg-background px-2 py-0.5 text-sm font-mono text-foreground outline-none"
                />
              ) : (
                <span className="text-sm font-mono text-muted-foreground w-24 shrink-0">
                  {fmtClock(e.durationSeconds || 0)}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate flex-1">{e.note || '—'}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.source}</span>
              {editingId === e.id ? (
                <button onClick={() => saveEdit(e.id)} className="text-muted-foreground hover:text-foreground transition" title={t('tm_save')}>
                  <Check className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => { setEditingId(e.id); setEditMin(String(Math.max(1, Math.round((e.durationSeconds || 0) / 60)))); }}
                  className="text-muted-foreground hover:text-foreground transition"
                  title={t('tm_edit_duration')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => deleteEntry(e.id)}
                className="text-muted-foreground hover:text-red-400 transition"
                title={t('tm_delete_entry')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pageEntries.length < entries.length && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition"
        >
          {t('tm_show_more', { count: entries.length - pageEntries.length })}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/10 bg-foreground/[0.02] px-2 py-2.5 text-center min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-[13px] sm:text-sm text-muted-foreground truncate" title={value}>{value}</p>
    </div>
  );
}
