
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { VoiceName, Story } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_KEY = 'voxgemini_books_cache';

function getCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(bookId: string, content: string) {
  try {
    const cache = getCache();
    cache[bookId] = content;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache storage failed", e);
  }
}

function cleanContent(text: string): string {
  return text
    .replace(/^.*STATUT.*$/gim, '')
    .replace(/^.*EXTRACTION.*$/gim, '')
    .replace(/^.*TITRE\s*:.*$/gim, '')
    .replace(/^.*AUTEUR\s*:.*$/gim, '')
    .replace(/^.*LANGUE\s*:.*$/gim, '')
    .replace(/^.*FORMAT\s*:.*$/gim, '')
    .replace(/^.*RÉPONSE API.*$/gim, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/^\*\*.*$/gm, '')
    .replace(/^\(.*\)$/gm, '')
    .replace(/\[.*\]/gm, '')
    .trim();
}

export async function fetchFullBookContent(book: Partial<Story>, language: string = 'fr'): Promise<string> {
  const cache = getCache();
  const bookKey = book.id || `${book.title}-${book.author}`;
  
  if (cache[bookKey]) {
    return cache[bookKey];
  }

  const prompt = `Rédige un résumé narratif détaillé et immersif du livre "${book.title}" par "${book.author}". 
  Le texte doit être divisé en paragraphes clairs. Utilise la langue suivante : ${language}.
  Ne donne QUE le texte de l'histoire, sans introduction, sans conclusion, sans titres de chapitres techniques.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "Tu es un conteur. Ta sortie ne contient que le récit pur. Jamais de métadonnées.",
    }
  });

  const rawContent = response.text || "Contenu non disponible.";
  const content = cleanContent(rawContent);
  
  if (content && content !== "Contenu non disponible.") {
    setCache(bookKey, content);
  }

  return content;
}

export async function searchLongStory(query: string, language: 'fr' | 'en' | 'ar' = 'fr'): Promise<Partial<Story>> {
  const prompt = `Rédige intégralement une histoire captivante sur le thème suivant : "${query}".
  Le récit doit être riche, long, avec des descriptions immersives et des dialogues si nécessaire.
  Langue : ${language}. 
  Important : Ne mets AUCUN titre au début, commence directement par le premier paragraphe de l'histoire. 
  Pas de gras (**), pas de listes, juste du texte narratif pur.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "Tu es un écrivain professionnel spécialisé dans la narration audio.",
    }
  });

  const content = cleanContent(response.text || "");

  const gradients = [
    "from-indigo-600 to-purple-900",
    "from-emerald-600 to-teal-900",
    "from-amber-600 to-orange-900",
    "from-rose-600 to-pink-900",
    "from-sky-600 to-indigo-900"
  ];

  return {
    id: `custom-${Date.now()}`,
    title: query,
    author: "Vox AI Narrator",
    content: content,
    category: "Créations",
    language,
    coverEmoji: "✨",
    coverGradient: gradients[Math.floor(Math.random() * gradients.length)],
    timestamp: Date.now()
  };
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio,
        },
      },
      { text: "Transcribe the following audio accurately." },
    ],
  });
  return response.text || "";
}

export async function getFastResponse(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "";
}

export async function generateSpeech(
  text: string, 
  voice: VoiceName = VoiceName.Kore,
  isSoothing: boolean = true
): Promise<string> {
  // Mapping interne : les noms "App" vers les vraies voix Gemini
  let actualVoiceName = 'Kore'; 

  if (voice.includes('Zephyr')) actualVoiceName = 'Zephyr';
  else if (voice.includes('Puck')) actualVoiceName = 'Puck';
  else if (voice.includes('Charon')) actualVoiceName = 'Charon';
  else if (voice.includes('Fenrir')) actualVoiceName = 'Fenrir';
  // Mapping Arabe
  else if (voice.includes('Layla')) actualVoiceName = 'Zephyr'; 
  else if (voice.includes('Hamza')) actualVoiceName = 'Fenrir';
  else if (voice.includes('Noor')) actualVoiceName = 'Puck';   
  else if (voice.includes('Zaid')) actualVoiceName = 'Charon'; 
  else actualVoiceName = 'Kore';

  // Optimisation : On envoie le texte brut pour éviter que le modèle
  // n'interprète des instructions de style ("read slowly") qui ralentissent la génération
  // et la vitesse de lecture.
  let finalPrompt = text;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: finalPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: actualVoiceName as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      console.error("Gemini TTS response missing audio data", response);
      throw new Error("No audio data returned from API");
    }
    return base64Audio;
  } catch (error) {
    console.error("Speech generation failed:", error);
    throw error;
  }
}

export const PRESET_BOOKS: Partial<Story>[] = [
  { id: 'f1', title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", category: "Classique", coverEmoji: "🤴", coverGradient: "from-amber-400 to-orange-500", language: 'fr' },
  { id: 'f2', title: "Les Fables de La Fontaine", author: "Jean de La Fontaine", category: "Fable", coverEmoji: "🦊", coverGradient: "from-green-500 to-emerald-800", language: 'fr' },
  { id: 'f3', title: "Cendrillon", author: "Charles Perrault", category: "Conte", coverEmoji: "👠", coverGradient: "from-blue-300 to-indigo-500", language: 'fr' },
  { id: 'f4', title: "Le Chat Botté", author: "Charles Perrault", category: "Conte", coverEmoji: "🐱", coverGradient: "from-orange-400 to-red-600", language: 'fr' },
  { id: 'f10', title: "Candide", author: "Voltaire", category: "Philosophie", coverEmoji: "🌱", coverGradient: "from-lime-500 to-emerald-700", language: 'fr' },
  { id: 'e1', title: "Alice in Wonderland", author: "Lewis Carroll", category: "Fantasy", coverEmoji: "🐰", coverGradient: "from-pink-400 to-purple-600", language: 'en' },
  { id: 'a1', title: "ألف ليلة وليلة", author: "تراث شعبي", category: "Arabe", coverEmoji: "🌙", coverGradient: "from-indigo-900 to-purple-900", language: 'ar' },
  { id: 'a6', title: "علي بابا والأربعون حرامي", author: "تراث", category: "Arabe", coverEmoji: "💎", coverGradient: "from-amber-600 to-yellow-900", language: 'ar' }
];

export function createChatSession(systemInstruction: string = "Helpful AI.") {
  return ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction } });
}
