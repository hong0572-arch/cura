import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.VITE_CHATBOT_API_KEY}); 
console.log('Testing interactions.create with tools payload...');

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
    
    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));
    const response = await ai.interactions.create(payload);
    console.log("SUCCESS:", response);
  } catch(e) {
    console.error("ERROR:");
    console.error(e.message);
  }
}

run();
