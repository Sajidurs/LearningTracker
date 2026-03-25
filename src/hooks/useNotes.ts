import { useState, useCallback, useEffect } from "react";
import { notesApi } from "@/api/notes.api";
import { Note } from "@/types/models";
import { toast } from "@/hooks/use-toast";

export const useNotes = (userId: string | undefined) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const fetchedNotes = await notesApi.getNotes(userId);
      setNotes(fetchedNotes);
    } catch (e: any) {
      console.error("Failed to fetch notes:", e);
      setError(e.message || "Could not load notes.");
      toast({ title: "Failed to load notes", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (title: string, content: string = "") => {
    if (!userId) return null;
    try {
      const newNote = await notesApi.createNote(userId, title, content);
      setNotes((prev) => [newNote, ...prev]);
      return newNote;
    } catch (e: any) {
      console.error("Create note error:", e);
      toast({ title: "Failed to create note", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const updateNote = async (id: string, title: string, content: string) => {
    try {
      // Optimistic update
      setNotes((prev) => 
        prev.map(note => note.id === id ? { ...note, title, content, updated_at: new Date().toISOString() } : note)
      );
      
      const updatedNote = await notesApi.updateNote(id, { title, content });
      
      // Real update
      setNotes((prev) => 
        prev.map(note => note.id === id ? updatedNote : note).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
      return updatedNote;
    } catch (e: any) {
      console.error("Update note error:", e);
      // Revert optimistic update (simplest way is to refetch, or we could store a backup)
      fetchNotes();
      toast({ title: "Failed to save note", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      // Optimistic delete
      setNotes((prev) => prev.filter(note => note.id !== id));
      await notesApi.deleteNote(id);
      toast({ title: "Note deleted" });
      return true;
    } catch (e: any) {
      console.error("Delete note error:", e);
      fetchNotes(); // Revert
      toast({ title: "Failed to delete note", description: e.message, variant: "destructive" });
      return false;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes
  };
};
