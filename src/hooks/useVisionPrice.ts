import { useEffect, useState } from "react";
import api from "@/lib/api";

const currencyByRegion: Record<string, string> = {
  AE: "aed",
  AD: "eur",
  AR: "ars",
  AT: "eur",
  AU: "aud",
  BE: "eur",
  BG: "eur",
  BR: "brl",
  CA: "cad",
  CH: "chf",
  CL: "clp",
  CN: "cny",
  CO: "cop",
  CY: "eur",
  DE: "eur",
  DK: "dkk",
  EE: "eur",
  ES: "eur",
  FI: "eur",
  FR: "eur",
  GB: "gbp",
  GR: "eur",
  HK: "hkd",
  HR: "eur",
  IE: "eur",
  IL: "ils",
  IN: "inr",
  IT: "eur",
  JP: "jpy",
  KR: "krw",
  LT: "eur",
  LU: "eur",
  LV: "eur",
  MT: "eur",
  MC: "eur",
  ME: "eur",
  MX: "mxn",
  NL: "eur",
  NO: "nok",
  NZ: "nzd",
  PE: "pen",
  PL: "pln",
  PT: "eur",
  SA: "sar",
  SE: "sek",
  SG: "sgd",
  SI: "eur",
  SK: "eur",
  SM: "eur",
  TR: "try",
  US: "usd",
  VA: "eur",
  XK: "eur",
  ZA: "zar",
};

/** Price text read from Stripe via backend. Never converts currencies locally. */
export function useVisionPrice() {
  const [label, setLabel] = useState<string>("—");
  useEffect(() => {
    api.get("/api/plans/prices").then(({ data }) => {
      const d = data?.vision?.monthlyDisplay;
      if (!d?.currency || d.unitAmount == null) return;
      const locale = new Intl.NumberFormat().resolvedOptions().locale;
      const region = locale.match(/[-_]([a-z]{2})(?:[-_]|$)/i)?.[1]?.toUpperCase();
      const baseCurrency = d.currency.toLowerCase();
      const localCurrency = region ? currencyByRegion[region] : undefined;
      const localAmount = localCurrency ? d.currencyOptions?.[localCurrency.toLowerCase()] : undefined;
      const currency = localAmount != null ? localCurrency : baseCurrency;
      const amount = localAmount ?? d.unitAmount;
      setLabel(
        new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(amount / 100),
      );
    }).catch(() => {});
  }, []);
  return label;
}
