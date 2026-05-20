import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";

export default function TimeTracking() {
  const location = useLocation();
  const isProjectsPage = location.pathname.startsWith('/projects');

  const viewLabel = isProjectsPage ? 'Projects' : 'Activities';
  const viewDescription = isProjectsPage
    ? 'Track your project activities and milestones.'
    : 'Track your daily activities and task history.';

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
        
        {/* Mantendo a mesma estrutura de grid lateral do Notes/Entities se necessário */}
        <main className="min-w-0 flex-1">
          
          {/* Cabeçalho com o mesmo visual idêntico do Notes */}
          <header className="mb-8 border-b border-white/5 pb-6">
            <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">
              Tracking
            </p>
            <h1 className="font-serif text-4xl font-normal tracking-tight text-white sm:text-5xl">
              {viewLabel}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {viewDescription}
            </p>
          </header>

          {/* A lista existente entra aqui, herdando o novo contexto visual */}
          <div className="rounded-sm border border-white/5 bg-black/20 p-1">
            <TimeTrackingList filterType={isProjectsPage ? 'PROJECT' : 'ACTIVITY'} />
          </div>

        </main>
      </div>
    </AppLayout>
  );
}