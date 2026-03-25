import { supabase } from "@/integrations/supabase/client";

export const journeysApi = {
  async createJourney(userId: string, title: string, description: string, startDate: Date, endDate?: Date) {
    const { data, error } = await supabase
      .from("learning_journeys")
      .insert({
        user_id: userId,
        title,
        description,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
      } as any)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async createTopics(topics: any[]) {
    const { error } = await supabase.from("topics").insert(topics as any);
    if (error) throw error;
  },

  async createNotification(userId: string, title: string, message: string, type: string) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
    } as any);
    if (error) throw error;
  },

  async generateOutlineWithAI(title: string, apiKey?: string): Promise<string[]> {
    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional learning curriculum designer. You generate structured learning outlines. You MUST respond with a JSON object."
            },
            {
              role: "user",
              content: `Generate a structured learning outline for: "${title}". 
              Respond with a JSON object containing a property "topics" which is an array of 6-12 subtopic strings. 
              Example: { "topics": ["Introduction to HTML", "CSS for Beginners", "Mastering JavaScript Basics"] }`
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Error: ${response.status}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      const outline = content.topics || content.outline || content.curriculum || [];
      if (outline.length === 0) throw new Error("No topics found in AI response");
      return outline;
    } else {
      const { data, error } = await supabase.functions.invoke("generate-outline", { body: { topic: title } });
      if (error) throw error;
      if (!data?.outline) throw new Error("Failed to generate outline via Edge Function");
      return data.outline;
    }
  },
  
  async triggerEmail(to: string, type: "welcome" | "purchase" | "password_update" | "journey_created", data?: any) {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to, type, data }
    });
    if (error) throw error;
  }
};
