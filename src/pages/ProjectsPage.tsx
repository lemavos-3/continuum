import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Project { id: string; name: string; count: number }

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Project[]>("/api/connections/projects").then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16"><FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Nenhum projeto mencionado ainda</p></div>
      ) : (
        <div className="space-y-2">
          {items.map((p, i) => (
            <motion.button key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/project/${p.id}`)} className="glass-subtle rounded-xl p-4 w-full text-left flex items-center gap-3 hover:bg-accent/60 transition-colors">
              <FolderKanban className="w-5 h-5 text-success" />
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{p.count}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
