import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from '../constants';

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelId = "gemini-2.5-flash";

/**
 * Converts a File object to a base64 format compatible with the Gemini SDK.
 */
export const fileToGenerativePart = async (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      // Remove the "data:image/jpeg;base64," prefix
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Uses Gemini to analyze an image and generate metadata for a Pin.
 */
export async function generatePinMetadata(file: File) {
  const imagePart = await fileToGenerativePart(file);

  const prompt = `Analyze this image for a Pinterest-style visual discovery application.
  1. Generate a short, catchy Title (max 50 chars).
  2. Generate an inspiring Description (max 150 chars).
  3. Select the most relevant Category from this specific list: ${CATEGORIES.join(', ')}. If none fit perfectly, pick the closest one.
  4. Generate 5-8 relevant Tags (single words).
  
  Return the result in JSON format.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
        parts: [
            imagePart,
            { text: prompt }
        ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
