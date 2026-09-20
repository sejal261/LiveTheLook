import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_PATH = path.join(__dirname, '..', 'data', 'interior_knowledge.json');

function loadStaticKnowledge() {
  try {
    if (fs.existsSync(KNOWLEDGE_PATH)) {
      const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading static interior knowledge:', err.message);
  }
  return {};
}

function getCatalogSummary() {
  try {
    const designs = db.getDesigns({ limit: 8 });
    const categories = db.getCategories();
    const styles = db.getStyles();

    return {
      categories: categories.map(c => c.name),
      styles: styles.map(s => s.name),
      featured_designs: designs.map(d => ({
        id: d.id,
        title: d.title,
        category: d.category_name,
        style: d.style_name,
        description: d.description,
        products_count: d.products.length
      }))
    };
  } catch (err) {
    console.warn('Error getting catalog summary:', err.message);
    return {};
  }
}

function generateFallbackResponse(userMessage) {
  const msg = (userMessage || '').toLowerCase();
  const staticK = loadStaticKnowledge();
  const catalog = getCatalogSummary();

  let rec = "Focus on cohesive color palettes, layered lighting, functional layout, and scale-appropriate furniture.";
  if (msg.includes('small') || msg.includes('bedroom')) {
    rec = "Maximize vertical space, use neutral base colors, and choose furniture with built-in storage.";
  } else if (msg.includes('kitchen')) {
    rec = "Maintain the ergonomic work triangle (sink, stove, fridge) and optimize task lighting.";
  } else if (msg.includes('living')) {
    rec = "Anchor the space with a comfortable seating layout and a natural focal point like a coffee table or fireplace.";
  } else if (msg.includes('light')) {
    rec = "Combine ambient, task, and accent lighting at varying heights to add warmth.";
  } else if (msg.includes('balcony') || msg.includes('outdoor')) {
    rec = "Use weather-resistant teak or rattan, hanging vertical planters, and warm fairy lights.";
  } else if (msg.includes('color') || msg.includes('paint')) {
    rec = "Apply the 60-30-10 rule: 60% dominant neutral, 30% secondary tone, and 10% bold accent.";
  }

  const steps = [
    "Select a clear focal point and build your layout around it.",
    "Use warm ambient lighting combined with task lamps for depth.",
    "Incorporate natural materials like wood, jute, linen, or brass for tactile texture."
  ];

  const avoid = "- Avoid overcrowding with oversized furniture or excessive dark, unmatched tones.";

  // Find matching design on our platform
  let dbMention = "";
  if (catalog.featured_designs && catalog.featured_designs.length > 0) {
    const matched = catalog.featured_designs.find(d =>
      msg.includes(d.category.toLowerCase()) ||
      msg.includes(d.style.toLowerCase()) ||
      d.title.toLowerCase().split(' ').some(w => w.length > 3 && msg.includes(w))
    ) || catalog.featured_designs[0];

    if (matched) {
      dbMention = `\n\nRECOMMENDED DESIGN ON OUR WEBSITE:\nCheck out '${matched.title}' (${matched.category} - ${matched.style} style) to shop the exact furniture and decor pictured!`;
    }
  }

  return `RECOMMENDATION:\n${rec}\n\nSTEPS:\n1. ${steps[0]}\n2. ${steps[1]}\n3. ${steps[2]}\n\nAVOID:\n${avoid}${dbMention}`;
}

let geminiClient = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export async function getChatbotResponse(userMessage) {
  const cleanMessage = (userMessage || '').trim();
  if (!cleanMessage) {
    return "Please ask me an interior design question or inquire about our featured room designs!";
  }

  const staticK = loadStaticKnowledge();
  const catalog = getCatalogSummary();

  const systemPrompt = `You are an expert interior design assistant for our website platform "LiveTheLook" (InteriorCraft).
Use the supplied knowledge base and website design catalogue to answer user questions clearly, helpfully, and concisely.

Always format your response with these exact headers:
RECOMMENDATION:
One short main recommendation sentence.

STEPS:
1. First practical action.
2. Second practical action.
3. Third practical action.

AVOID:
- One or two practical things to avoid.

RECOMMENDED DESIGN ON OUR WEBSITE:
Mention a relevant design from the catalog below if applicable.

Keep the total answer under 140 words. Warm, practical, and inspiring language.

Static Knowledge:
${JSON.stringify(staticK, null, 2)}

Live Platform Designs Catalogue:
${JSON.stringify(catalog, null, 2)}`;

  // 1. Try Gemini API if key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getGeminiClient();
      if (ai) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\nUser Question: ${cleanMessage}`
        });
        const reply = response.text ? response.text.trim() : null;
        if (reply) {
          return reply;
        }
      }
    } catch (err) {
      console.warn('Gemini API call error (falling back to rules):', err.message);
    }
  }

  // 2. High-quality rule-based fallback
  return generateFallbackResponse(cleanMessage);
}
