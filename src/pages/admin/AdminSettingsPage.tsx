import { useState, useEffect } from "react";
import { Key, Server, Activity, CheckCircle, AlertCircle, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const StatusIndicator = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    {ok ? <CheckCircle className="w-4 h-4 text-primary" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
    <span className="text-sm text-foreground">{label}</span>
    <span className={`text-xs font-medium ml-auto ${ok ? "text-primary" : "text-destructive"}`}>{ok ? "Connected" : "Not Connected"}</span>
  </div>
);

const AdminSettingsPage = () => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ stripe: boolean; database: boolean; auth: boolean; storage: boolean } | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiKeyExists, setGeminiKeyExists] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    loadGeminiKey();
  }, []);

  const loadGeminiKey = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();
    if (data?.value) {
      setGeminiKey(data.value);
      setGeminiKeyExists(true);
    }
  };

  const saveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    setSavingKey(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "gemini_api_key", value: geminiKey.trim() }, { onConflict: "key" });
      if (error) throw error;
      setGeminiKeyExists(true);
      toast.success("Gemini API key saved successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

  const removeGeminiKey = async () => {
    setSavingKey(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("key", "gemini_api_key");
      if (error) throw error;
      setGeminiKey("");
      setGeminiKeyExists(false);
      setShowKey(false);
      toast.success("Gemini API key removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove API key");
    } finally {
      setSavingKey(false);
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    const results = { stripe: false, database: false, auth: false, storage: false };
    try {
      const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      results.database = !error;
    } catch (_) {}
    try {
      const { data } = await supabase.auth.getSession();
      results.auth = !!data.session;
    } catch (_) {}
    try {
      const { error } = await supabase.storage.from("avatars").list("", { limit: 1 });
      results.storage = !error;
    } catch (_) {}
    try {
      const { data } = await supabase.functions.invoke("admin-api", { body: { action: "get_payments" } });
      results.stripe = !data?.error;
    } catch (_) {}
    setStatus(results);
    setChecking(false);
  };

  const maskedKey = geminiKey ? geminiKey.slice(0, 6) + "•".repeat(Math.max(0, geminiKey.length - 10)) + geminiKey.slice(-4) : "";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">Settings & System Status</h1>

      {/* Gemini API Key */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Gemini API Key</h2>
          {geminiKeyExists && <span className="text-xs font-medium text-primary ml-auto">Configured ✓</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          Enter your Google Gemini API key to power the AI outline generation. Get one from{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Google AI Studio
          </a>.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={showKey ? geminiKey : (geminiKeyExists ? maskedKey : geminiKey)}
              onChange={(e) => { setGeminiKey(e.target.value); setGeminiKeyExists(false); }}
              placeholder="AIzaSy..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button onClick={saveGeminiKey} disabled={savingKey} size="sm" className="gap-1">
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
        {geminiKeyExists && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removeGeminiKey} disabled={savingKey}>
            Remove Key
          </Button>
        )}
      </div>

      {/* System Status */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">System Status</h2>
          </div>
          <Button variant="outline" size="sm" onClick={checkStatus} disabled={checking}>
            {checking ? "Checking..." : "Run Check"}
          </Button>
        </div>
        {status ? (
          <div className="space-y-3">
            <StatusIndicator ok={status.database} label="Database" />
            <StatusIndicator ok={status.auth} label="Authentication" />
            <StatusIndicator ok={status.storage} label="File Storage" />
            <StatusIndicator ok={status.stripe} label="Stripe Payments" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Click "Run Check" to verify all services.</p>
        )}
      </div>

      {/* Platform Info */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Platform Info</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Frontend:</span> <span className="text-foreground font-medium">React + Vite</span></div>
          <div><span className="text-muted-foreground">Backend:</span> <span className="text-foreground font-medium">Lovable Cloud</span></div>
          <div><span className="text-muted-foreground">Payments:</span> <span className="text-foreground font-medium">Stripe</span></div>
          <div><span className="text-muted-foreground">AI Models:</span> <span className="text-foreground font-medium">Google Gemini</span></div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
