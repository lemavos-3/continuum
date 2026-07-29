import { useNavigate } from "react-router-dom";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/contexts/LanguageContext";

type Row = { label: string; free: string | boolean; vision: string | boolean };

function Cell({ value, accent }: { value: string | boolean; accent?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon className={`mx-auto h-4 w-4 ${accent ? "text-white" : "text-white/45"}`} />
    ) : (
      <MinusIcon className="mx-auto h-4 w-4 text-white/15" />
    );
  }
  return (
    <span className={`text-sm tabular-nums ${accent ? "text-white/90" : "text-white/60"}`}>{value}</span>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const rows: Row[] = [
    { label: t("bill_row_notes"), free: "50", vision: t("bill_unlimited") },
    { label: t("bill_row_entities"), free: "20", vision: t("bill_unlimited") },
    { label: t("bill_row_history_retention"), free: "30 days", vision: t("bill_unlimited") },
    { label: t("bill_row_upload_metadata"), free: "10 KB", vision: "2048 KB" },
    { label: t("bill_row_native_sync"), free: true, vision: true },
    { label: t("bill_row_offline_mode"), free: true, vision: true },
    { label: t("bill_row_knowledge_graph"), free: true, vision: true },
    { label: t("bill_row_data_export"), free: false, vision: true },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="#/"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white"
        >
          {t("bill_back_to_home")}
        </a>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{t("bill_pricing_plans")}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">
          {t("bill_simple_pricing")}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
          {t("bill_pricing_subtitle")}
        </p>

        {/* Plan headers */}
        <div className="mt-12 grid grid-cols-[1.4fr_1fr_1fr] items-end gap-2 border-b border-white/10 pb-5">
          <div />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{t("bill_free")}</p>
            <p className="mt-2 font-serif text-2xl text-white">$0</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/30">{t("bill_forever")}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">{t("bill_vision")}</p>
            <p className="mt-2 font-serif text-2xl text-white">$7.90</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/30">{t("bill_per_month")}</p>
          </div>
        </div>

        {/* Comparison rows */}
        <dl className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 py-3.5">
              <dt className="text-sm text-white/70">{r.label}</dt>
              <dd className="text-center">
                <Cell value={r.free} />
              </dd>
              <dd className="text-center">
                <Cell value={r.vision} accent />
              </dd>
            </div>
          ))}
        </dl>

        {/* CTAs */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("/register")}
            className="flex h-11 items-center justify-center border border-white/15 bg-transparent text-[11px] uppercase tracking-[0.28em] text-white/80 rounded-sm transition-colors hover:border-white/40 hover:text-white"
          >
            {t("bill_start_for_free")}
          </button>
          <button
            onClick={() => navigate("/subscription")}
            className="flex h-11 items-center justify-center border border-white bg-white text-[11px] uppercase tracking-[0.28em] text-black rounded-sm transition-all hover:bg-transparent hover:text-white"
          >
            {t("bill_upgrade_to_vision")}
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
          {t("bill_cancel_secure")}
        </p>
      </div>
    </div>
  );
}
