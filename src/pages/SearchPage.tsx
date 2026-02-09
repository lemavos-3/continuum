import { useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, FolderKanban, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "project" | "habit";
  count: number;
}

const typeIcons = { person: Users, project: FolderKanban, habit: Zap };
const typeColors = { person: "text-primary", project: "text-success", habit: "text-warning" };
const filters = ["all", "person", "project", "habit"] as const;
const filterLabels = { all: "Todos", person: "Pessoas", project: "Projetos", habit: "Hábitos" };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ query });
      if (type !== "all") params.set("type", type);
      const data = await api.get<SearchResult[]>(`/api/connections/search?${params}`);
      setResults(data);
    } catch { /* */ }
    setLoading(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Busca</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar pessoas, projetos, hábitos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-11"
        />
        <Button onClick={handleSearch} size="icon" className="h-11 w-11 rounded-xl shrink-0">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setType(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {results.map((r, i) => {
          const Icon = typeIcons[r.type];
          return (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/${r.type}/${r.id}`)}
              className="glass-subtle rounded-xl p-4 w-full text-left flex items-center gap-3 hover:bg-accent/60 transition-colors"
            >
              <Icon className={`w-5 h-5 ${typeColors[r.type]}`} />
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{r.count} menções</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
