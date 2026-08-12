import { GoogleGenAI } from "@google/genai"; const ai = new GoogleGenAI({apiKey: "foo"}); const i = await ai.interactions.create({model: "gemini-2.5-flash", input: "hi"}); console.log(i);
