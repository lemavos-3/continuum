import { useEffect, useRef, useState } from "react";
import type { useAdaptiveCheckout } from "@/hooks/useAdaptiveCheckout";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SmoothDrawer from "@/components/ui/smooth-drawer";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type CheckoutState = ReturnType<typeof useAdaptiveCheckout>;

function PaymentForm({ state, onClose }: { state: CheckoutState; onClose: () => void }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const paymentRef = useRef<HTMLDivElement>(null);
  const currencySelectorRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromoCode, setApplyingPromoCode] = useState(false);

  useEffect(() => {
    if (!state.open || !state.checkout || !paymentRef.current || !currencySelectorRef.current) return;

    const paymentElement = state.checkout.createPaymentElement({ layout: "tabs" });
    const currencySelectorElement = state.checkout.createCurrencySelectorElement();
    paymentElement.mount(paymentRef.current);
    currencySelectorElement.mount(currencySelectorRef.current);

    return () => {
      paymentElement.unmount();
      currencySelectorElement.unmount();
    };
  }, [state.checkout, state.open]);

  const confirmPayment = async () => {
    if (!state.actions) return;
    setConfirming(true);
    try {
      const returnUrl = new URL("/settings", window.location.origin);
      returnUrl.searchParams.set("status", "success");
      const result = await state.actions.confirm({
        returnUrl: returnUrl.toString(),
        redirect: "always",
      });
      if (result.type === "error") {
        toast({ title: t("bill_error"), description: result.error.message, variant: "destructive" });
        return;
      }
      window.location.assign(returnUrl.toString());
    } catch (cause) {
      toast({
        title: t("bill_error"),
        description: cause instanceof Error ? cause.message : t("bill_try_again"),
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const applyPromoCode = async () => {
    if (!state.actions) return;
    const code = promoCode.trim();
    if (!code) {
      toast({ title: t("bill_promo_code_required"), variant: "destructive" });
      return;
    }

    setApplyingPromoCode(true);
    try {
      const result = await state.actions.applyPromotionCode(code);
      if (result.type === "error") {
        toast({ title: t("bill_error"), description: result.error.message, variant: "destructive" });
      }
    } catch (cause) {
      toast({
        title: t("bill_error"),
        description: cause instanceof Error ? cause.message : t("bill_try_again"),
        variant: "destructive",
      });
    } finally {
      setApplyingPromoCode(false);
    }
  };

  return (
    <SmoothDrawer
      open={state.open}
      onOpenChange={(open) => { if (!confirming) state.setOpen(open); }}
      title="VISION"
      description={t("bill_cancel_secure")}
      className="z-[110] max-h-[92dvh]"
      bodyClassName="px-5 pb-5"
    >
      {state.loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          {t("bill_preparing_checkout")}
        </div>
      ) : state.error ? (
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
          <Button className="w-full" onClick={state.retry}>{t("bill_try_again")}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={t("bill_promo_code")}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyPromoCode}
              disabled={applyingPromoCode || !state.actions}
            >
              {t("bill_apply")}
            </Button>
          </div>
          <div ref={currencySelectorRef} />
          <p className="text-center font-serif text-3xl text-foreground">{state.price}</p>
          <p className="text-center text-xs text-muted-foreground">{t("bill_per_month")}</p>
          <div ref={paymentRef} />
          <Button className="w-full" onClick={confirmPayment} disabled={confirming || !state.actions}>
            {confirming && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
            {confirming ? t("bill_opening") : t("bill_upgrade_to_vision")}
          </Button>
          <Button type="button" variant="quiet" className="w-full" onClick={onClose} disabled={confirming}>
            {t("common_cancel")}
          </Button>
        </div>
      )}
    </SmoothDrawer>
  );
}

export function AdaptiveCheckoutDialog({ state }: { state: CheckoutState }) {
  return <PaymentForm state={state} onClose={() => state.setOpen(false)} />;
}
