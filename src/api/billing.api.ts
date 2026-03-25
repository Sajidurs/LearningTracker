import { supabase } from "@/integrations/supabase/client";

export const billingApi = {
  async getPlans() {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    
    if (error) throw error;
    return data;
  },

  async checkSubscription() {
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (error) throw error;
    return data; // returns { plan, subscription_end, invoices, payment_methods }
  },

  async createCheckout(priceId: string) {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
    });
    
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async customerPortal() {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    return data;
  }
};
