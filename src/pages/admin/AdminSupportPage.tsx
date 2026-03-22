import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, BookOpen, HelpCircle, Video, Mail, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SupportItem {
  id: string;
  section: string;
  title: string;
  content: string | null;
  url: string | null;
  sort_order: number;
  is_active: boolean;
}

const SECTIONS = [
  { value: "guide", label: "Quick Start Guide", icon: BookOpen },
  { value: "faq", label: "FAQ", icon: HelpCircle },
  { value: "video", label: "Video Guide", icon: Video },
  { value: "contact", label: "Contact Info", icon: Mail },
  { value: "social", label: "Social Media", icon: Globe },
];

const AdminSupportPage = () => {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<SupportItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("guide");

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "list_support" },
    });
    if (data?.items) setItems(data.items);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    if (!editItem?.title?.trim()) return;
    setSaving(true);
    const action = editItem.id ? "update_support" : "create_support";
    const { error } = await supabase.functions.invoke("admin-api", {
      body: { action, ...editItem },
    });
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editItem.id ? "Updated" : "Created" });
      setEditItem(null);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.functions.invoke("admin-api", {
      body: { action: "delete_support", id },
    });
    toast({ title: "Deleted" });
    fetchItems();
  };

  const filtered = items.filter(i => i.section === activeSection).sort((a, b) => a.sort_order - b.sort_order);

  const sectionInfo = SECTIONS.find(s => s.value === activeSection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Support & Help Management</h1>
          <p className="text-sm text-muted-foreground">Manage guides, FAQs, videos, and contact information shown to users.</p>
        </div>
        <Button
          className="rounded-xl gap-2"
          onClick={() => setEditItem({ section: activeSection, title: "", content: "", url: "", sort_order: filtered.length, is_active: true })}
        >
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setActiveSection(s.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No items in this section yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                  {!item.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                {item.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>}
                {item.url && <p className="text-xs text-primary mt-0.5 truncate">{item.url}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setEditItem(item)} className="h-8 w-8 p-0 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Section</label>
                <Select value={editItem.section} onValueChange={(v) => setEditItem({ ...editItem, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                <Input value={editItem.title || ""} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} placeholder="e.g. How to get started" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Content / Description</label>
                <Textarea value={editItem.content || ""} onChange={(e) => setEditItem({ ...editItem, content: e.target.value })} placeholder="Detailed text content..." rows={3} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL (optional - video link, social profile, etc.)</label>
                <Input value={editItem.url || ""} onChange={(e) => setEditItem({ ...editItem, url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sort Order</label>
                <Input type="number" value={editItem.sort_order ?? 0} onChange={(e) => setEditItem({ ...editItem, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">Visible to users</label>
                <Switch checked={editItem.is_active ?? true} onCheckedChange={(v) => setEditItem({ ...editItem, is_active: v })} />
              </div>
              <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving || !editItem.title?.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editItem.id ? "Update" : "Create"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportPage;
