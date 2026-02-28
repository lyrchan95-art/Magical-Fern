import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GeneratedFlora {
  id: string;
  prompt: string;
  refinedPrompt: string;
  imageUrl: string;
  timestamp: number;
}

export async function refinePlantPrompt(userInput: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Refine this magical plant description into a highly detailed image generation prompt. 
    The style should be "mystical magical layer color illustration with surrealism and whimsical botanical art".
    
    If the user provides a quote or text, ensure it is rendered as a high-quality, center-aligned illustration. 
    The text must be:
    - Center-aligned within the composition.
    - Large and legible (font size 36 or above).
    - Dynamically scaled to fit the artwork while maintaining a safe margin from the edges.
    - Artistically integrated into the surreal botanical environment (e.g., glowing letters made of stardust or bioluminescent spores).
    
    Focus on colors, lighting (bioluminescence, rainbow light), and surreal textures (glass leaves, glowing spores).
    
    User Input: ${userInput}
    
    Output ONLY the refined prompt string.`,
  });
  
  return response.text || userInput;
}

export async function generatePlantImage(refinedPrompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: refinedPrompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  let imageUrl = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64EncodeString = part.inlineData.data;
      imageUrl = `data:image/png;base64,${base64EncodeString}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("Failed to generate image");
  }

  return imageUrl;
}
