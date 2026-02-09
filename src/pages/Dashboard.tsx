import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCountUp } from "@/hooks/useCountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface DashboardData {
  totalPeople: number;
  totalProjects: number;
  totalHabits: number;
  topPeople: { id: string; name: string; count: number }[];
  topProjects: { id: string; name: string; count: number }[];
  topHabits: { id: string; name: string; count: number }[];
}

function StatCard({ icon: Icon, label, value, color, delay }: { icon: any; label: string; value: number; color: string; delay: number }) {
  const count = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-2xl p-6 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

function TopSection({ title, items, basePath, icon: Icon }: { title: string; items: { id: string; name: string; count: number }[]; basePath: string; icon: any }) {
  const navigate = useNavigate();
  if (!items?.length) return null;
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => navigate(`${basePath}/${item.id}`)}
            className="glass-subtle rounded-xl p-4 text-left hover:bg-accent/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium text-foreground truncate">{item.name}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.count}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>("/api/connections/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral das suas conexões</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Pessoas" value={data?.totalPeople ?? 0} color="bg-primary/10 text-primary" delay={0} />
            <StatCard icon={FolderKanban} label="Projetos" value={data?.totalProjects ?? 0} color="bg-success/10 text-success" delay={0.1} />
            <StatCard icon={Zap} label="Hábitos" value={data?.totalHabits ?? 0} color="bg-warning/10 text-warning" delay={0.2} />
          </div>

          <div className="space-y-6">
            <TopSection title="Top Pessoas" items={data?.topPeople ?? []} basePath="/person" icon={Users} />
            <TopSection title="Top Projetos" items={data?.topProjects ?? []} basePath="/project" icon={FolderKanban} />
            <TopSection title="Top Hábitos" items={data?.topHabits ?? []} basePath="/habit" icon={Zap} />
          </div>
        </>
      )}
    </div>
  );
}
