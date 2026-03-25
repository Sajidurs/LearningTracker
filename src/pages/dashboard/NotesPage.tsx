import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/hooks/useNotes";
import { Note } from "@/types/models";
import { format } from "date-fns";
import { Plus, Trash2, Edit3, Loader2, Save, X, FileText, ChevronLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

const NotesPage = () => {
  const { user } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes(user?.id);
  const isMobile = useIsMobile();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const activeNote = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content || "");
    } else {
      setTitle("");
      setContent("");
    }
  }, [activeNoteId]);

  const handleCreate = async () => {
    const newNote = await createNote("Untitled Note");
    if (newNote) {
      setActiveNoteId(newNote.id);
    }
  };

  const handleSave = async () => {
    if (!activeNoteId) return;
    setIsSaving(true);
    await updateNote(activeNoteId, title, content);
    setIsSaving(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
      const success = await deleteNote(id);
      if (success && activeNoteId === id) {
        setActiveNoteId(null);
      }
    }
  };

  const renderSidebar = () => (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", 
      isMobile && activeNoteId ? "hidden" : "w-full md:w-80 lg:w-96 shrink-0")}>
      <div className="p-4 md:p-6 border-b border-border flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Notes
        </h1>
        <Button onClick={handleCreate} size="sm" className="h-9 px-3 rounded-xl gap-2 font-medium">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first note to get started.</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={cn(
                "group p-3 md:p-4 rounded-2xl cursor-pointer transition-all border",
                activeNoteId === note.id 
                  ? "bg-primary/5 text-primary border-primary/20 shadow-sm" 
                  : "bg-transparent hover:bg-muted/50 text-foreground border-transparent hover:border-border/50"
              )}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate leading-tight mb-1">
                    {note.title || "Untitled Note"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate opacity-80 h-4">
                    {note.content ? note.content.replace(/<[^>]+>/g, '') : "No content"}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-1.5 opacity-60">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] uppercase font-medium tracking-wider">
                  {format(new Date(note.updated_at), "MMM d, h:mm a")}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className={cn("flex flex-col flex-1 bg-background h-full", 
      isMobile && !activeNoteId ? "hidden" : "flex")}>
      
      {activeNoteId ? (
        <>
          <div className="h-14 md:h-16 px-4 md:px-6 border-b border-border flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setActiveNoteId(null)} className="md:hidden -ml-2 hover:bg-muted">
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Button>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {activeNote ? `Last edited ${format(new Date(activeNote.updated_at), "MMM d, yyyy")}` : ""}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {title !== activeNote?.title || content !== activeNote?.content ? (
                <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8 md:h-9 px-4 rounded-xl font-medium shadow-sm transition-all duration-300 bg-primary hover:bg-primary/90">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save
                </Button>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 bg-muted/20 px-2.5 py-1">Saved</Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10 max-w-4xl mx-auto w-full">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full text-2xl md:text-4xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 mb-6 font-heading tracking-tight"
            />
            {/* Minimalist plain text content area - for a production V4 app
                we'd use Tiptap or similar, but a cleanly styled textarea is a great minimalist start */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="w-full h-full min-h-[500px] text-base md:text-lg bg-transparent border-none outline-none text-foreground/90 placeholder:text-muted-foreground/40 resize-none leading-relaxed custom-scrollbar pb-20"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-muted/10">
          <div className="w-20 h-20 bg-muted rounded-full flex flex-col items-center justify-center mb-6 shadow-sm border border-border/50">
            <Edit3 className="w-8 h-8 text-primary/60" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Select a note</h2>
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mb-6">
            Choose a note from the sidebar or create a new one to start writing.
          </p>
          <Button onClick={handleCreate} className="rounded-xl px-6 font-medium shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Create New Note
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] -m-4 md:-m-6 flex overflow-hidden bg-background">
      {renderSidebar()}
      {renderEditor()}
    </div>
  );
};

// Custom Badge component locally for the "Saved" indicator to avoid extra imports if it's missing
const Badge = ({ children, className, variant = "default" }: any) => {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold transition-colors",
      variant === "outline" ? "border border-input text-foreground" : "border-transparent bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
};

export default NotesPage;
