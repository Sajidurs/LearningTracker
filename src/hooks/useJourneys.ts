import { useState, useCallback } from "react";
import { journeysApi } from "@/api/journeys.api";

export const useJourneys = (userId: string | undefined) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createJourney = useCallback(
    async (
      title: string,
      description: string,
      startDate: Date,
      endDate: Date | undefined,
      topics: string[],
      weeklyPlan: Record<number, string[]>
    ) => {
      if (!userId) {
        setError("User must be logged in to create a journey");
        return null;
      }
      
      setLoading(true);
      setError(null);
      try {
        // Create the journey
        const journey = await journeysApi.createJourney(userId, title, description, startDate, endDate);

        // Prep topics
        const topicInserts = topics.map((t, i) => {
          let weekNum: number | null = null;
          for (const [week, items] of Object.entries(weeklyPlan)) {
            if (items.includes(t)) { weekNum = parseInt(week); break; }
          }
          return {
            journey_id: journey.id,
            user_id: userId,
            title: t,
            week_number: weekNum,
            sort_order: i,
            points_value: 10,
          };
        });

        if (topicInserts.length > 0) {
          await journeysApi.createTopics(topicInserts);
        }

        // Send notifications & emails
        await journeysApi.createNotification(
          userId,
          "Journey Created",
          `Your learning journey "${title}" with ${topics.length} topics has been created!`,
          "success"
        );

        // Attempt to send email but don't fail the create if it errors
        try {
          await journeysApi.triggerEmail(userId, "journey_created", { title, topics });
        } catch (e) {
          console.error("Failed to send journey created email:", e);
        }

        return journey;
      } catch (e: any) {
        console.error("Create journey error:", e);
        setError(e.message || "Failed to create journey");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const generateAiOutline = useCallback(async (title: string, apiKey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const outline = await journeysApi.generateOutlineWithAI(title, apiKey);
      return outline;
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      setError(e.message === "OpenAI Error: 401" ? "Invalid API Key. Please check your .env" : e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createJourney,
    generateAiOutline,
    loading,
    error,
  };
};
