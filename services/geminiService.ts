import { GoogleGenAI } from "@google/genai";
import { Difficulty } from "../types";

const API_KEY = process.env.API_KEY || '';

export const generateBossDialogue = async (difficulty: Difficulty, stage: number): Promise<string> => {
  if (!API_KEY) {
    return "TARGET IDENTIFIED. ENGAGING.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview';

    const prompt = `
      You are writing a single line of dialogue for a Cyberpunk AI Boss in a bullet hell game.
      The boss is about to fight the player.
      Tone: Cold, menacing, technological, arrogant.
      Difficulty: ${difficulty}
      Stage: ${stage}
      
      Output ONLY the dialogue line. No quotes. Max 15 words.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || "PROTOCOL EXECUTED.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "CONNECTION UNSTABLE. ENGAGING MANUAL OVERRIDE.";
  }
};
