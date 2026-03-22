import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Youtube, Plus, Upload, Loader2, X, Trash2, ExternalLink, Link2, Save, CheckCircle2, Play, Pause, FileText, ChevronLeft, ChevronRight, Timer, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface TopicData {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  points_value: number;
  youtube_url: string | null;
  journey_id: string;
  sort_order: number;
}

interface SubTopic {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

interface TopicDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

interface TopicLink {
  id: string;
  title: string | null;
  url: string;
  created_at: string;
}

interface SiblingTopic {
  id: string;
  title: string;
}

interface TimeEntry {
  id: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

const getYoutubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const TopicDetailPage = () => {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [documents, setDocuments] = useState<TopicDocument[]>([]);
  const [links, setLinks] = useState<TopicLink[]>([]);
  const [timerHistory, setTimerHistory] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevTopic, setPrevTopic] = useState<SiblingTopic | null>(null);
  const [nextTopic, setNextTopic] = useState<SiblingTopic | null>(null);

  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pointsValue, setPointsValue] = useState(10);
  const [newSubTopic, setNewSubTopic] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<TopicDocument | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef(false);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef<Date | null>(null);

  const fetchData = async () => {
    if (!user || !topicId) return;
    const [topicRes, subsRes, docsRes, linksRes, historyRes] = await Promise.all([
      supabase.from("topics").select("*").eq("id", topicId).eq("user_id", user.id).single(),
      supabase.from("sub_topics").select("*").eq("topic_id", topicId).order("sort_order"),
      supabase.from("topic_documents").select("*").eq("topic_id", topicId).order("created_at", { ascending: false }),
      supabase.from("topic_links" as any).select("*").eq("topic_id", topicId).order("created_at", { ascending: false }),
      supabase.from("time_entries").select("*").eq("topic_id", topicId).order("created_at", { ascending: false }),
    ]);
    if (topicRes.data) {
      const t = topicRes.data as any;
      setTopic(t); setDescription(t.description || ""); setYoutubeUrl(t.youtube_url || ""); setPointsValue(t.points_value);
      const { data: allTopics } = await supabase.from("topics").select("id, title, sort_order").eq("journey_id", t.journey_id).eq("user_id", user.id).order("sort_order");
      if (allTopics) {
        const idx = allTopics.findIndex((tp: any) => tp.id === topicId);
        setPrevTopic(idx > 0 ? { id: allTopics[idx - 1].id, title: allTopics[idx - 1].title } : null);
        setNextTopic(idx < allTopics.length - 1 ? { id: allTopics[idx + 1].id, title: allTopics[idx + 1].title } : null);
      }
    }
    if (subsRes.data) setSubTopics(subsRes.data as any);
    if (docsRes.data) setDocuments(docsRes.data as any);
    if (linksRes.data) setLinks(linksRes.data as any);
    if (historyRes.data) setTimerHistory(historyRes.data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!hasFetchedRef.current) setLoading(true);
    hasFetchedRef.current = true;
    fetchData();
  }, [user, topicId]);

  // Auto-save description, youtube, points every 10 seconds when changed
  useEffect(() => {
    if (!topic) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      await supabase.from("topics").update({ description, youtube_url: youtubeUrl || null, points_value: pointsValue } as any).eq("id", topic.id);
    }, 10000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [description, youtubeUrl, pointsValue]);

  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000); }
    else if (timerRef.current) { clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const startTimer = () => { timerStartRef.current = new Date(); setTimerSeconds(0); setTimerRunning(true); };
  const pauseTimer = () => setTimerRunning(false);

  const stopAndSaveTimer = async () => {
    setTimerRunning(false);
    if (!user || !topicId || timerSeconds === 0) return;
    await supabase.from("time_entries").insert({
      topic_id: topicId, user_id: user.id,
      started_at: timerStartRef.current?.toISOString(), ended_at: new Date().toISOString(), duration_seconds: timerSeconds,
    } as any);
    setTimerSeconds(0);
    toast({ title: "Time saved!", description: `${formatTime(timerSeconds)} recorded.` });
    fetchData();
  };

  const handleSave = async () => {
    if (!topic) return;
    setSaving(true);
    await supabase.from("topics").update({ description, youtube_url: youtubeUrl || null, points_value: pointsValue } as any).eq("id", topic.id);
    if (timerSeconds > 0) await stopAndSaveTimer();
    setSaving(false);
    toast({ title: "Topic saved!" }); fetchData();
  };

  const handleComplete = async () => {
    if (!topic || !user) return;
    const newVal = !topic.is_completed;
    await supabase.from("topics").update({ is_completed: newVal } as any).eq("id", topic.id);
    if (newVal) {
      await supabase.from("points_log").insert({ user_id: user.id, topic_id: topic.id, points: pointsValue, reason: `Completed: ${topic.title}` } as any);
      const { data: profileData } = await supabase.from("profiles").select("total_points").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ total_points: (profileData?.total_points || 0) + pointsValue } as any).eq("user_id", user.id);
      toast({ title: `+${pointsValue} points!`, description: `Completed "${topic.title}"` });
      refreshProfile();
    } else {
      const { data: profileData } = await supabase.from("profiles").select("total_points").eq("user_id", user.id).single();
      await supabase.from("profiles").update({ total_points: Math.max(0, (profileData?.total_points || 0) - pointsValue) } as any).eq("user_id", user.id);
      refreshProfile();
    }
    await handleSave();
    navigate(`/app/learning/${slug}`);
  };

  const removeVideo = async () => {
    if (!topic) return;
    setYoutubeUrl("");
    await supabase.from("topics").update({ youtube_url: null } as any).eq("id", topic.id);
    toast({ title: "Video removed" }); fetchData();
  };

  const addSubTopic = async () => {
    if (!newSubTopic.trim() || !user || !topicId || !topic) return;
    // Save current unsaved topic fields before refetching to prevent data loss
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await supabase.from("topics").update({ description, youtube_url: youtubeUrl || null, points_value: pointsValue } as any).eq("id", topic.id);
    await supabase.from("sub_topics").insert({ topic_id: topicId, user_id: user.id, title: newSubTopic.trim(), sort_order: subTopics.length } as any);
    setNewSubTopic(""); fetchData();
  };

  const toggleSubTopic = async (sub: SubTopic) => {
    await supabase.from("sub_topics").update({ is_completed: !sub.is_completed } as any).eq("id", sub.id);
    fetchData();
  };

  const deleteSubTopic = async (id: string) => { await supabase.from("sub_topics").delete().eq("id", id); fetchData(); };

  const handleFileUpload = async (file: File) => {
    if (!user || !topicId) return;
    setUploading(true);
    const filePath = `${user.id}/${topicId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("topic-documents").upload(filePath, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    // Store the storage path (not a public URL) so we can create signed URLs later
    await supabase.from("topic_documents").insert({ topic_id: topicId, user_id: user.id, file_name: file.name, file_url: filePath, file_size: file.size } as any);
    setUploading(false); toast({ title: "Document uploaded!", description: file.name }); fetchData();
  };

  const deleteDocument = async (doc: TopicDocument) => { await supabase.from("topic_documents").delete().eq("id", doc.id); fetchData(); };

  const addLink = async () => {
    if (!newLinkUrl.trim() || !user || !topicId) return;
    await supabase.from("topic_links" as any).insert({ topic_id: topicId, user_id: user.id, title: newLinkTitle.trim() || null, url: newLinkUrl.trim() } as any);
    setNewLinkTitle(""); setNewLinkUrl(""); toast({ title: "Link added!" }); fetchData();
  };

  const deleteLink = async (id: string) => { await supabase.from("topic_links" as any).delete().eq("id", id); fetchData(); };

  const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null;
  const totalTimeSpent = timerHistory.reduce((sum, e) => sum + e.duration_seconds, 0);

  // Helper to get a signed URL for a document
  const getSignedUrl = async (doc: TopicDocument): Promise<string> => {
    // If file_url is already a full URL (legacy), use it directly
    if (doc.file_url.startsWith("http")) return doc.file_url;
    // Otherwise create a signed URL from the storage path
    const { data } = await supabase.storage.from("topic-documents").createSignedUrl(doc.file_url, 3600);
    return data?.signedUrl || doc.file_url;
  };

  const openDocViewer = async (doc: TopicDocument) => {
    const url = await getSignedUrl(doc);
    setViewingUrl(url);
    setViewingDoc(doc);
  };

  const openDocExternal = async (doc: TopicDocument) => {
    const url = await getSignedUrl(doc);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-8 w-64" /></div>
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Topic not found.</p>
        <Link to={`/app/learning/${slug}`}><Button variant="outline" className="rounded-xl gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <Link to={`/app/learning/${slug}`}>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">{topic.title}</h1>
        </div>
        {topic.is_completed && <Badge className="bg-primary/10 text-primary rounded-full px-3 py-1 shrink-0">Completed</Badge>}
      </div>

      {/* Prev / Next Navigation */}
      <div className="flex items-center justify-between mb-6 gap-2 sm:gap-3">
        {prevTopic ? (
          <Link to={`/app/learning/${slug}/topic/${prevTopic.id}`} className="flex-1 min-w-0">
            <Button variant="outline" className="w-full rounded-xl h-auto py-2.5 sm:py-3 px-2.5 sm:px-4 justify-start gap-1.5 sm:gap-3 text-left">
              <ChevronLeft className="w-4 h-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Previous</p>
                <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80px] sm:max-w-none">{prevTopic.title}</p>
              </div>
            </Button>
          </Link>
        ) : <div className="flex-1" />}
        {nextTopic ? (
          <Link to={`/app/learning/${slug}/topic/${nextTopic.id}`} className="flex-1 min-w-0">
            <Button variant="outline" className="w-full rounded-xl h-auto py-2.5 sm:py-3 px-2.5 sm:px-4 justify-end gap-1.5 sm:gap-3 text-right">
              <div className="min-w-0 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Next</p>
                <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80px] sm:max-w-none">{nextTopic.title}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </Button>
          </Link>
        ) : <div className="flex-1" />}
      </div>

      {/* Two-column layout — stacks on mobile */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* YouTube Video */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">YouTube Video</h3>
              </div>
              {embedUrl && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive gap-1" onClick={removeVideo}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              )}
            </div>
            <Input placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="text-sm" />
            {embedUrl && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                <iframe src={embedUrl} title="YouTube video" className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )}
          </motion.div>

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <Textarea placeholder="Add a description..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px] text-sm" />
          </motion.div>

          {/* Sub-topics */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Sub-topics</h3>
              <Badge variant="outline" className="text-xs">{subTopics.filter(s => s.is_completed).length}/{subTopics.length}</Badge>
            </div>
            <div className="space-y-1">
              {subTopics.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors group">
                  <button onClick={() => toggleSubTopic(sub)}>
                    <CheckCircle2 className={`w-4 h-4 ${sub.is_completed ? "text-primary" : "text-border"}`} />
                  </button>
                  <span className={`text-sm flex-1 ${sub.is_completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{sub.title}</span>
                  <button onClick={() => deleteSubTopic(sub.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add a sub-topic..." value={newSubTopic} onChange={(e) => setNewSubTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubTopic()} className="text-sm" />
              <Button size="sm" onClick={addSubTopic} disabled={!newSubTopic.trim()} className="rounded-xl gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </motion.div>

          {/* Save & Complete Buttons — desktop only (inline) */}
          <div className="hidden lg:flex flex-row gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl gap-2 h-12" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </Button>
            <Button className="flex-1 rounded-xl gap-2 h-12" variant={topic.is_completed ? "secondary" : "default"} onClick={handleComplete}>
              <CheckCircle2 className="w-4 h-4" />
              {topic.is_completed ? "Mark Incomplete" : `Complete (+${pointsValue} pts)`}
            </Button>
          </div>
        </div>

        {/* RIGHT: Sidebar — visible on desktop, stacked on mobile */}
        <div className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Learning Timer */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Learning Timer</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-bold font-mono text-foreground text-center py-2">{formatTime(timerSeconds)}</p>
            <div className="flex items-center gap-2">
              {!timerRunning ? (
                <Button size="sm" onClick={startTimer} className="gap-1.5 rounded-xl flex-1"><Play className="w-3.5 h-3.5" /> Start</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseTimer} className="gap-1.5 rounded-xl flex-1"><Pause className="w-3.5 h-3.5" /> Pause</Button>
              )}
              {timerSeconds > 0 && (
                <Button size="sm" variant="secondary" onClick={stopAndSaveTimer} className="rounded-xl flex-1">Save Time</Button>
              )}
            </div>
            {totalTimeSpent > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Total time on this topic</p>
                <p className="text-sm font-semibold text-foreground">{formatDuration(totalTimeSpent)}</p>
              </div>
            )}
            {timerHistory.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Recent Sessions</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {timerHistory.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50 text-xs">
                      <span className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" "}{new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="font-medium text-foreground">{formatDuration(entry.duration_seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Points on Completion */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Points on Completion</h3>
            </div>
            <p className="text-xs text-muted-foreground">Points earned when completed</p>
            <Input type="number" min={0} value={pointsValue} onChange={(e) => setPointsValue(parseInt(e.target.value) || 0)} className="text-center font-bold text-lg" />
          </motion.div>

          {/* Learning Materials */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Learning Materials</h3>
            </div>
            {documents.length > 0 && (
              <div className="space-y-1">
            {documents.map((doc) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.file_name);
                  const isPdf = /\.pdf$/i.test(doc.file_name);
                  const canView = isImage || isPdf;
                  return (
                    <div key={doc.id} className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors group">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate cursor-pointer hover:text-primary" onClick={() => canView ? openDocViewer(doc) : openDocExternal(doc)}>{doc.file_name}</span>
                      {doc.file_size && <span className="text-[10px] text-muted-foreground hidden sm:inline">{formatFileSize(doc.file_size)}</span>}
                      {canView && (
                        <button onClick={() => openDocViewer(doc)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10" title="View">
                          <ExternalLink className="w-3 h-3 text-primary" />
                        </button>
                      )}
                      <button onClick={() => deleteDocument(doc)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border hover:border-primary cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Upload document"}</span>
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
            </label>
          </motion.div>

          {/* Helpful Links */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="p-4 sm:p-5 rounded-2xl bg-card shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Helpful Links</h3>
            </div>
            {links.length > 0 && (
              <div className="space-y-1">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors group">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">{link.title || link.url}</a>
                    <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Input placeholder="Title (optional)" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} className="text-xs" />
              <div className="flex gap-2">
                <Input placeholder="https://example.com" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()} className="text-xs flex-1" />
                <Button size="sm" onClick={addLink} disabled={!newLinkUrl.trim()} className="rounded-xl gap-1 text-xs px-2.5">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 flex gap-3 safe-bottom">
        <Button variant="outline" className="flex-1 rounded-xl gap-2 h-11" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </Button>
        <Button className="flex-1 rounded-xl gap-2 h-11" variant={topic.is_completed ? "secondary" : "default"} onClick={handleComplete}>
          <CheckCircle2 className="w-4 h-4" />
          {topic.is_completed ? "Incomplete" : `Complete (+${pointsValue})`}
        </Button>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setViewingDoc(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-elevated max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground truncate">{viewingDoc.file_name}</h3>
              <div className="flex items-center gap-2">
                <a href={viewingUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs">
                    <ExternalLink className="w-3 h-3" /> Open
                  </Button>
                </a>
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setViewingDoc(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 min-h-[400px]">
              {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(viewingDoc.file_name) ? (
                <img src={viewingUrl} alt={viewingDoc.file_name} className="w-full h-auto rounded-xl object-contain max-h-[75vh]" />
              ) : /\.pdf$/i.test(viewingDoc.file_name) ? (
                <div className="w-full min-h-[70vh] flex flex-col items-center justify-center gap-4">
                  <object data={viewingUrl} type="application/pdf" className="w-full h-[70vh] rounded-xl">
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">PDF preview not supported in this browser.</p>
                      <a href={viewingUrl} target="_blank" rel="noopener noreferrer" download>
                        <Button size="sm" className="rounded-xl gap-2">
                          <ExternalLink className="w-3.5 h-3.5" /> Download PDF
                        </Button>
                      </a>
                    </div>
                  </object>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TopicDetailPage;
