import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface JournalEntry {
  _id: string;
  content: string;
  createdAt: string;
}

function highlightMentions(text: string) {
  return text.replace(
    /(@\w+|#\w+|\*\w+)/g,
    (match) => {
      if (match.startsWith("@")) return `<span class="text-primary font-medium">${match}</span>`;
      if (match.startsWith("#")) return `<span class="text-success font-medium">${match}</span>`;
      return `<span class="text-warning font-medium">${match}</span>`;
    }
  );
}

function MentionPreview({ content }: { content: string }) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.mention) {
      const mention = target.dataset.mention;
      const type = mention.startsWith("@") ? "person" : mention.startsWith("#") ? "project" : "habit";
      const name = mention.slice(1);
      navigate(`/${type}/${name}`);
    }
  };

  const html = content.replace(
    /(@\w+|#\w+|\*\w+)/g,
    (match) => {
      const cls = match.startsWith("@") ? "text-primary" : match.startsWith("#") ? "text-success" : "text-warning";
      return `<span class="${cls} font-medium cursor-pointer hover:underline" data-mention="${match}">${match}</span>`;
    }
  );

  return <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} className="text-sm text-foreground whitespace-pre-wrap" />;
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [content, setContent] = useState(() => localStorage.getItem("continuum_draft") || "");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.get<JournalEntry[]>("/api/journal")
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("continuum_draft", content);
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const entry = await api.post<JournalEntry>("/api/journal", { content });
      setEntries((prev) => [entry, ...prev]);
      setContent("");
      localStorage.removeItem("continuum_draft");
      setShowEditor(false);
      toast({ title: "Entrada salva!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal</h1>
          <p className="text-muted-foreground text-sm mt-1">Suas reflexões e conexões</p>
        </div>
        <Button onClick={() => setShowEditor(!showEditor)} size="sm" className="rounded-xl gap-2">
          {showEditor ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showEditor ? "Fechar" : "Nova entrada"}
        </Button>
      </div>

      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Escrever</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Hoje eu conversei com @João sobre o #ProjetoX e pratiquei *meditação..."
                    className="min-h-[180px] font-mono-editor text-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</label>
                  <div className="min-h-[180px] rounded-lg bg-muted/50 p-4 overflow-auto">
                    {content ? <MentionPreview content={content} /> : (
                      <p className="text-sm text-muted-foreground italic">O preview aparecerá aqui...</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Use <span className="text-primary font-medium">@pessoa</span>, <span className="text-success font-medium">#projeto</span>, <span className="text-warning font-medium">*hábito</span>
                </p>
                <Button onClick={handleSubmit} disabled={submitting || !content.trim()} size="sm" className="rounded-xl gap-2">
                  <Send className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhuma entrada ainda. Comece a escrever!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-subtle rounded-2xl p-5"
            >
              <MentionPreview content={entry.content.slice(0, 300) + (entry.content.length > 300 ? "..." : "")} />
              <p className="text-xs text-muted-foreground mt-3">
                {format(new Date(entry.createdAt), "d 'de' MMM, yyyy · HH:mm", { locale: ptBR })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
