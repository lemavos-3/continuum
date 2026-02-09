import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Heatmap } from "@/components/Heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface EntityData {
  name: string;
  totalMentions: number;
  heatmap: Record<string, number>;
  entries: { _id: string; content: string; createdAt: string }[];
}

const typeConfig = {
  person: { icon: Users, color: "text-primary", bgColor: "bg-primary/10", apiPath: "person" },
  project: { icon: FolderKanban, color: "text-success", bgColor: "bg-success/10", apiPath: "project" },
  habit: { icon: Zap, color: "text-warning", bgColor: "bg-warning/10", apiPath: "habit" },
};

export default function EntityTimeline({ type }: { type: "person" | "project" | "habit" }) {
  const { id } = useParams();
  const [data, setData] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    api.get<EntityData>(`/api/connections/${config.apiPath}/${id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, type]);

  const filtered = filterDate
    ? data?.entries.filter((e) => e.createdAt.startsWith(filterDate)) ?? []
    : data?.entries ?? [];

  if (loading) return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-4">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-muted-foreground">Não encontrado</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${config.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.totalMentions} menções totais</p>
        </div>
      </motion.div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Atividade</h2>
          {filterDate && (
            <button onClick={() => setFilterDate(null)} className="text-xs text-primary hover:underline">
              Limpar filtro
            </button>
          )}
        </div>
        <Heatmap data={data.heatmap} onDayClick={setFilterDate} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Entradas {filterDate && `· ${filterDate}`}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrada encontrada</p>
        ) : (
          filtered.map((entry, i) => (
            <motion.div
              key={entry._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-subtle rounded-xl p-4"
            >
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content.slice(0, 300)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(entry.createdAt), "d 'de' MMM, yyyy · HH:mm", { locale: ptBR })}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
