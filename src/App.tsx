import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UsageProvider } from "@/contexts/UsageContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Suspense, lazy } from "react";
import { Loader2 } from "@/lib/heroicons";
import { extractAuthTokensFromLocation, sanitizeAuthRedirectUrl } from "@/lib/auth-redirect";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Eager: tiny entry routes used on first paint
import Login from "./pages/Login";
import Register from "./pages/Register";
import LoginSuccess from "./pages/LoginSuccess";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";

// Lazy: heavy or rarely-visited routes
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const Entities = lazy(() => import("./pages/Entities"));
const EntityDetail = lazy(() => import("./pages/EntityDetail"));
const KnowledgeGraph = lazy(() => import("./pages/KnowledgeGraph"));
const Vault = lazy(() => import("./pages/Vault"));
const VaultDownload = lazy(() => import("./pages/VaultDownload"));
const Activities = lazy(() => import("./pages/Activities"));
const Projects = lazy(() => import("./pages/Projects"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Insights = lazy(() => import("./pages/Insights"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

function HomeRoute() {
  const { user, loading } = useAuth();
  sanitizeAuthRedirectUrl();
  const authTokens = extractAuthTokensFromLocation();

  if (authTokens?.accessToken) {
    return <LoginSuccess />;
  }

  if (loading) return <RouteFallback />;
  if (user) return <Dashboard />;
  return <LandingPage />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/index" element={<HomeRoute />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/google-callback" element={<GoogleCallback />} />
      <Route path="/login-successful" element={<LoginSuccess />} />
      <Route path="/login-token" element={<LoginSuccess />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/notes/:id" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
      <Route path="/entities" element={<ProtectedRoute><Entities /></ProtectedRoute>} />
      <Route path="/entities/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
      {/* Activity Routes */}
      <Route path="/tracking" element={<Navigate to="/activities" replace />} />
      <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      {/* Analytics Routes */}
      <Route path="/tracking/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
      <Route path="/activities/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><EntityDetail /></ProtectedRoute>} />
      <Route path="/graph" element={<ProtectedRoute><KnowledgeGraph /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
      <Route path="/vault/download/:fileId" element={<ProtectedRoute><VaultDownload /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <LanguageProvider>
            <AuthProvider>
              <UsageProvider>
                <EntityProvider>
                  <AppRoutes />
                </EntityProvider>
              </UsageProvider>
            </AuthProvider>
          </LanguageProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
    <Analytics />
    <SpeedInsights />
  </QueryClientProvider>
);

export default App;
