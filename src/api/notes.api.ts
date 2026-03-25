import { supabase } from "@/integrations/supabase/client";
import { Note } from "@/types/models";

export const notesApi = {
  async getNotes(userId: string): Promise<Note[]> {
    const { data, error } = await (supabase as any)
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    if (error) throw error;
    // Suppressing strict type error as DB schema might not be updated in local TS definitions yet
    return data as unknown as Note[];
  },

  async createNote(userId: string, title: string, content: string): Promise<Note> {
    const { data, error } = await (supabase as any)
      .from("notes")
      .insert({
        user_id: userId,
        title,
        content,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Note;
  },

  async updateNote(id: string, updates: Partial<Pick<Note, "title" | "content">>): Promise<Note> {
    const { data, error } = await (supabase as any)
      .from("notes")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Note;
  },

  async deleteNote(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("notes")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  }
};
