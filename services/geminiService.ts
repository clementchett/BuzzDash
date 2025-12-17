import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTriviaQuestion = async (topic?: string): Promise<string> => {
  try {
    const prompt = topic 
      ? `Generate a short, engaging trivia question about "${topic}". Return ONLY the question text.`
      : `Generate a random, interesting general knowledge trivia question. Return ONLY the question text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Failed to generate question:", error);
    return "Could not generate a question. Please try again.";
  }
};