import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LogOut, Download, Moon, Crown } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleExport = async () => {
    try {
      const data = await api.get("/api/journal");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dados exportados!" });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="glass rounded-2xl divide-y divide-border/50">
        <div className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Perfil</h2>
          <p className="font-medium text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Plano</h2>
            <p className="font-medium text-foreground mt-1">{user?.plan === "PRO" ? "Pro" : "Free"}</p>
          </div>
          {user?.plan !== "PRO" && (
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Crown className="w-4 h-4" />
              Upgrade
            </Button>
          )}
        </div>

        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Modo escuro</span>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>

        <div className="p-5">
          <Button variant="outline" onClick={handleExport} className="w-full rounded-xl gap-2">
            <Download className="w-4 h-4" />
            Exportar dados (JSON)
          </Button>
        </div>

        <div className="p-5">
          <Button variant="destructive" onClick={handleLogout} className="w-full rounded-xl gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
