import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Save, X, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  max_journeys: number;
  max_topics: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

const defaultPlan: Omit<Plan, "id"> = {
  name: "",
  slug: "",
  price: 0,
  currency: "usd",
  interval: "month",
  max_journeys: 2,
  max_topics: 100,
  features: [],
  is_active: true,
  sort_order: 0,
  stripe_price_id: null,
  stripe_product_id: null,
};

const AdminPlansPage = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Partial<Plan> & typeof defaultPlan>(defaultPlan);
  const [isNew, setIsNew] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "list_plans" },
    });
    if (data?.plans) {
      setPlans(data.plans);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openNew = () => {
    setEditPlan({ ...defaultPlan, sort_order: plans.length });
    setIsNew(true);
    setFeatureInput("");
    setEditOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan({ ...plan });
    setIsNew(false);
    setFeatureInput("");
    setEditOpen(true);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setEditPlan(p => ({ ...p, features: [...p.features, featureInput.trim()] }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setEditPlan(p => ({ ...p, features: p.features.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!editPlan.name.trim() || !editPlan.slug.trim()) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const action = isNew ? "create_plan" : "update_plan";
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action, ...editPlan },
    });
    if (error || data?.error) {
      toast({ title: "Failed to save plan", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: isNew ? "Plan created!" : "Plan updated!" });
      setEditOpen(false);
      fetchPlans();
    }
    setSaving(false);
  };

  const handleDelete = async (planId: string) => {
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "delete_plan", planId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to delete", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Plan deleted" });
      setDeleteConfirm(null);
      fetchPlans();
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Plan Management</h1>
          <p className="text-sm text-muted-foreground">Create, edit and manage subscription plans</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`rounded-2xl border p-5 space-y-3 transition-colors ${plan.is_active ? "bg-card border-border shadow-card" : "bg-muted/30 border-border/50 opacity-70"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                  {!plan.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{plan.slug}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(plan)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(plan.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}`}
              </span>
              {plan.price > 0 && <span className="text-sm text-muted-foreground">/{plan.interval}</span>}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{plan.max_journeys === -1 ? "Unlimited" : plan.max_journeys} Journeys</p>
              <p>{plan.max_topics === -1 ? "Unlimited" : plan.max_topics} Topics</p>
            </div>

            {plan.features.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1">
                {plan.features.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    {f}
                  </p>
                ))}
              </div>
            )}

            {plan.stripe_price_id && (
              <p className="text-[10px] text-muted-foreground font-mono pt-1 truncate">
                Stripe: {plan.stripe_price_id}
              </p>
            )}
          </div>
        ))}

        {plans.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No plans configured yet. Create your first plan.</p>
          </div>
        )}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Create Plan" : "Edit Plan"}</DialogTitle>
            <DialogDescription>Configure the plan details, pricing, and features.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan Name</label>
                <Input value={editPlan.name} onChange={(e) => setEditPlan(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug</label>
                <Input value={editPlan.slug} onChange={(e) => setEditPlan(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="e.g. starter" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Price (cents)</label>
                <Input type="number" value={editPlan.price} onChange={(e) => setEditPlan(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Currency</label>
                <Input value={editPlan.currency} onChange={(e) => setEditPlan(p => ({ ...p, currency: e.target.value }))} placeholder="usd" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Interval</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editPlan.interval}
                  onChange={(e) => setEditPlan(p => ({ ...p, interval: e.target.value }))}
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Journeys (-1 = unlimited)</label>
                <Input type="number" value={editPlan.max_journeys} onChange={(e) => setEditPlan(p => ({ ...p, max_journeys: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Topics (-1 = unlimited)</label>
                <Input type="number" value={editPlan.max_topics} onChange={(e) => setEditPlan(p => ({ ...p, max_topics: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stripe Price ID</label>
                <Input value={editPlan.stripe_price_id || ""} onChange={(e) => setEditPlan(p => ({ ...p, stripe_price_id: e.target.value || null }))} placeholder="price_..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stripe Product ID</label>
                <Input value={editPlan.stripe_product_id || ""} onChange={(e) => setEditPlan(p => ({ ...p, stripe_product_id: e.target.value || null }))} placeholder="prod_..." />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={editPlan.is_active} onChange={(e) => setEditPlan(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="is_active" className="text-sm text-foreground">Active</label>
            </div>

            {/* Features */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Features</label>
              <div className="space-y-1.5 mb-2">
                {editPlan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 text-sm">
                    <span className="flex-1 text-foreground">{f}</span>
                    <button onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  placeholder="Add a feature..." className="text-sm" />
                <Button size="sm" variant="outline" onClick={addFeature} disabled={!featureInput.trim()} className="rounded-xl">Add</Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isNew ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Plan?</DialogTitle>
            <DialogDescription>This action cannot be undone. Users on this plan won't be affected immediately but should be migrated.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="rounded-xl">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlansPage;
