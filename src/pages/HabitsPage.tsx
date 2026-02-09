import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Habit { id: string; name: string; count: number }

export default function HabitsPage() {
  const [items, setItems] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Habit[]>("/api/connections/habits").then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Hábitos</h1>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16"><Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Nenhum hábito mencionado ainda</p></div>
      ) : (
        <div className="space-y-2">
          {items.map((h, i) => (
            <motion.button key={h.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/habit/${h.id}`)} className="glass-subtle rounded-xl p-4 w-full text-left flex items-center gap-3 hover:bg-accent/60 transition-colors">
              <Zap className="w-5 h-5 text-warning" />
              <span className="font-medium text-foreground">{h.name}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{h.count}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
