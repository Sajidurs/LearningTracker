import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer: string;
  created: number;
  receipt_url: string | null;
}

interface Subscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  plan: number | null;
  currency: string;
}

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  created: number;
}

const AdminPaymentsPage = () => {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-api", { body: { action: "get_payments" } });
      const data = res.data;
      const error = res.error;
      if (error) {
        console.error("Admin API error:", error);
      } else if (data && !data.error) {
        setCharges(data.charges || []);
        setSubscriptions(data.subscriptions || []);
        setCustomers(data.customers || []);
      } else {
        console.error("Payment data error:", data?.error);
      }
    } catch (e) {
      console.error("Failed to fetch payments:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const customerEmail = (custId: string) => customers.find(c => c.id === custId)?.email || custId;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments & Subscriptions</h1>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </div>

      {/* Active Subscriptions */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Subscriptions ({subscriptions.filter(s => s.status === "active").length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subscriptions.filter(s => s.status === "active").map(s => (
            <div key={s.id} className="bg-card rounded-xl p-4 border border-border shadow-card">
              <p className="text-sm font-medium text-foreground">{customerEmail(s.customer as string)}</p>
              <p className="text-xs text-muted-foreground mt-1">${((s.plan || 0) / 100).toFixed(2)}/{s.currency?.toUpperCase()}/mo</p>
              <p className="text-xs text-muted-foreground">Renews {format(new Date(s.current_period_end * 1000), "MMM d, yyyy")}</p>
              <span className="inline-block mt-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">{s.status}</span>
            </div>
          ))}
          {subscriptions.filter(s => s.status === "active").length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No active subscriptions yet.</p>
          )}
        </div>
      </section>

      {/* Recent Charges */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Charges</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium hidden md:table-cell">Status</th>
                <th className="pb-2 pr-4 font-medium hidden md:table-cell">Date</th>
                <th className="pb-2 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {charges.map(c => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="py-2.5 pr-4 text-foreground">{customerEmail(c.customer as string)}</td>
                  <td className="py-2.5 pr-4 font-medium text-foreground">${(c.amount / 100).toFixed(2)} {c.currency.toUpperCase()}</td>
                  <td className="py-2.5 pr-4 hidden md:table-cell">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${c.status === "succeeded" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{c.status}</span>
                  </td>
                  <td className="py-2.5 pr-4 hidden md:table-cell text-muted-foreground text-xs">{format(new Date(c.created * 1000), "MMM d, yyyy")}</td>
                  <td className="py-2.5">{c.receipt_url && <a href={c.receipt_url} target="_blank" className="text-xs text-primary hover:underline">View</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {charges.length === 0 && <p className="text-center py-10 text-muted-foreground">No charges found.</p>}
        </div>
      </section>
    </div>
  );
};

export default AdminPaymentsPage;
