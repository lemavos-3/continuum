import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { isAxiosError } from "axios";
import { subscriptionApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

type StripeInstance = NonNullable<Awaited<ReturnType<typeof loadStripe>>>;
type CheckoutSdk = ReturnType<StripeInstance["initCheckoutElementsSdk"]>;
type LoadActionsResult = Awaited<ReturnType<CheckoutSdk["loadActions"]>>;
type CheckoutActions = Extract<LoadActionsResult, { type: "success" }>["actions"];
type CheckoutSession = ReturnType<CheckoutActions["getSession"]>;

function getRecurringPrice(session: CheckoutSession): string {
  const amount = session.recurring?.dueNext.total.amount ?? session.lineItems[0]?.unitAmount.amount;
  if (!amount) throw new Error("Stripe did not return the localized subscription price.");
  return amount;
}

export function useAdaptiveCheckout(enabled = true) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const translateRef = useRef(t);
  translateRef.current = t;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [price, setPrice] = useState("—");
  const [checkout, setCheckout] = useState<CheckoutSdk | null>(null);
  const [actions, setActions] = useState<CheckoutActions | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const initialize = async () => {
      const { data } = await subscriptionApi.checkoutEmbedded("VISION");
      if (!data.clientSecret || !data.publishableKey) {
        throw new Error("Stripe did not return the credentials needed for localized checkout.");
      }

      const stripe = await loadStripe(data.publishableKey);
      if (!stripe) throw new Error("Stripe.js could not be initialized.");

      const instance = stripe.initCheckoutElementsSdk({
        clientSecret: data.clientSecret,
        adaptivePricing: { allowed: true },
        elementsOptions: { appearance: { theme: themeRef.current === "LIGHT" ? "stripe" : "night" } },
      });
      const result = await instance.loadActions();
      if (result.type === "error") throw new Error(result.error.message);

      const initialSession = result.actions.getSession();
      const initialPrice = getRecurringPrice(initialSession);
      if (cancelled) return;

      setPrice(initialPrice);
      setCheckout(instance);
      setActions(result.actions);
      instance.on("change", (session) => {
        if (!cancelled) {
          try {
            setPrice(getRecurringPrice(session));
            setError(null);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Stripe could not update the localized price.");
          }
        }
      });
    };

    initialize()
      .catch((cause: unknown) => {
        if (!cancelled) {
          const message = isAxiosError<{ message?: string }>(cause)
            ? cause.response?.data?.message ?? cause.message
            : cause instanceof Error
              ? cause.message
              : "Could not load localized Stripe pricing.";
          setError(message);
          toast({ title: translateRef.current("bill_error"), description: message, variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled, toast]);

  const openCheckout = useCallback(() => {
    if (loading) return;
    if (error) {
      setAttempt((current) => current + 1);
      return;
    }
    if (!checkout || !actions) return;
    setOpen(true);
  }, [actions, checkout, error, loading]);

  const canOpenCheckout = !loading && !error && Boolean(checkout && actions);

  return {
    price,
    checkout,
    actions,
    loading,
    error,
    canOpenCheckout,
    open,
    setOpen,
    openCheckout,
  };
}
