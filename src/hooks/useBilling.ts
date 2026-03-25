import { useState, useCallback, useEffect } from "react";
import { billingApi } from "@/api/billing.api";
import { Plan, Invoice, PaymentMethod } from "@/types/models";

export const useBilling = () => {
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const p = await billingApi.getPlans();
      setPlans(p as unknown as Plan[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchBillingDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingApi.checkSubscription();
      if (data) {
        setCurrentPlan(data.plan || "free");
        setSubscriptionEnd(data.subscription_end || null);
        setInvoices(data.invoices || []);
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCheckout = useCallback(async (priceId: string) => {
    setCheckoutLoading(priceId);
    setError(null);
    try {
      const data = await billingApi.createCheckout(priceId);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCheckoutLoading(null);
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    setError(null);
    try {
      const data = await billingApi.customerPortal();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  return {
    plans,
    currentPlan,
    subscriptionEnd,
    invoices,
    paymentMethods,
    loading,
    plansLoading,
    checkoutLoading,
    error,
    fetchPlans,
    fetchBillingDetails,
    handleCheckout,
    openCustomerPortal
  };
};
