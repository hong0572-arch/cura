import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.VITE_CHATBOT_API_KEY});

async function run() {
  try {
    const payload = {
      model: 'gemini-3.5-flash-lite', 
      input: 'hi', 
      tools: [{
        functionDeclarations: [{
          name: 'test', 
          description: 'desc', 
          parameters: {
            type: 'object', 
            properties: {a: {type: 'string'}}, 
            required: ['a']
          }
        }]
      }]
    };
    await ai.interactions.create(payload);
    console.log("camelCase SUCCESS");
  } catch(e) { console.error("camelCase ERROR:", e.message); }

  try {
    const payload2 = {
      model: 'gemini-3.5-flash-lite', 
      input: 'hi', 
      tools: [{
        function_declarations: [{
          name: 'test', 
          description: 'desc', 
          parameters: {
            type: 'object', 
            properties: {a: {type: 'string'}}, 
            required: ['a']
          }
        }]
      }]
    };
    await ai.interactions.create(payload2);
    console.log("snake_case SUCCESS");
  } catch(e) { console.error("snake_case ERROR:", e.message); }
}

run();
