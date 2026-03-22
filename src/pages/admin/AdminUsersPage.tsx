import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck, ShieldOff, Search } from "lucide-react";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: { full_name: string | null; plan: string; total_points: number; avatar_url: string | null } | null;
  roles: string[];
  journey_count: number;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", plan: "free" });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("admin-api", { body: { action: "list_users" } });
    if (data?.users) setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const { data } = await supabase.functions.invoke("admin-api", { body: { action: "delete_user", userId } });
    if (data?.success) { toast.success("User deleted"); fetchUsers(); }
    else toast.error(data?.error || "Failed");
  };

  const updatePlan = async (userId: string, plan: string) => {
    const { data } = await supabase.functions.invoke("admin-api", { body: { action: "update_plan", userId, plan } });
    if (data?.success) { toast.success("Plan updated"); fetchUsers(); }
    else toast.error(data?.error || "Failed");
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    const { data } = await supabase.functions.invoke("admin-api", { body: { action: "toggle_admin", userId, makeAdmin: !isAdmin } });
    if (data?.success) { toast.success(isAdmin ? "Admin removed" : "Admin granted"); fetchUsers(); }
    else toast.error(data?.error || "Failed");
  };

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password) { toast.error("Email and password required"); return; }
    setCreating(true);
    const { data } = await supabase.functions.invoke("admin-api", {
      body: { action: "create_user", ...newUser },
    });
    if (data?.success) {
      toast.success("User created");
      setCreateOpen(false);
      setNewUser({ email: "", password: "", fullName: "", plan: "free" });
      fetchUsers();
    } else toast.error(data?.error || "Failed");
    setCreating(false);
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">User Management</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />Add User</Button>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium hidden md:table-cell">Plan</th>
                <th className="pb-2 pr-4 font-medium hidden lg:table-cell">Journeys</th>
                <th className="pb-2 pr-4 font-medium hidden lg:table-cell">Joined</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => {
                const isAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-foreground">{u.profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {isAdmin && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">ADMIN</span>}
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <Select value={u.profile?.plan || "free"} onValueChange={v => updatePlan(u.id, v)}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell text-muted-foreground">{u.journey_count}</td>
                    <td className="py-3 pr-4 hidden lg:table-cell text-muted-foreground text-xs">{u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAdmin(u.id, isAdmin)} title={isAdmin ? "Remove admin" : "Make admin"}>
                          {isAdmin ? <ShieldOff className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteUser(u.id, u.email || "")}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-10 text-muted-foreground">No users found.</p>}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full Name" value={newUser.fullName} onChange={e => setNewUser(p => ({ ...p, fullName: e.target.value }))} />
            <Input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
            <Select value={newUser.plan} onValueChange={v => setNewUser(p => ({ ...p, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
