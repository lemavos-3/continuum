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
      {/* Centralizado sem o lg:flex-row, já que não temos mais sidebar */}
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-12 lg:py-16">
        <main className="min-w-0">
          
          {/* Cabeçalho idêntico ao do Notes */}
          <header className="mb-8">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">
                Tracking
              </p>
              <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">
                {viewLabel}
              </h1>
            </div>
            <p className="mt-3 text-sm text-white/40">
              {viewDescription}
            </p>
          </header>

          {/* Divisor visual que separa o header do conteúdo, igual ao Notes */}
          <div className="mb-6 border-b border-white/5 pb-3 pt-4" />

          {/* O conteúdo principal de Tracking */}
          <div className="rounded-sm border border-white/5 bg-black/20 p-1">
            <TimeTrackingList filterType={isProjectsPage ? 'PROJECT' : 'ACTIVITY'} />
          </div>

        </main>
      </div>
    </AppLayout>
  );
}