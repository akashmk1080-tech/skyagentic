import { KnowledgeItem, ScheduleItem, PriorityLevel, TaskCategory } from '../types';
import { StorageService } from './storage';

export interface GeneratedScheduleResponse {
  items: Array<{
    time: string;
    title: string;
    durationMinutes: number;
    category: TaskCategory;
    priority: PriorityLevel;
    sourceCitation: string;
    isActionableTask: boolean;
    notes?: string;
  }>;
  executiveSummary: string;
}

export const GeminiService = {
  /**
   * Helper to execute Gemini REST requests with user key or fallback
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const settings = await StorageService.getSettings();
    const apiKey = settings.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback local intelligent generator if no API key is provided yet
      return this.fallbackLocalGeneration(prompt);
    }

    const model = settings.geminiModel || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Gemini API returned error status:', response.status, errorText);
        return this.fallbackLocalGeneration(prompt);
      }

      const json = await response.json();
      const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
      return candidate || this.fallbackLocalGeneration(prompt);
    } catch (err) {
      console.warn('Gemini fetch failed, falling back to local synthesizer:', err);
      return this.fallbackLocalGeneration(prompt);
    }
  },

  /**
   * Generates structured timetable blocks & priority tasks from uploaded knowledge
   */
  async generateScheduleFromKnowledge(knowledge: KnowledgeItem[]): Promise<GeneratedScheduleResponse> {
    if (!knowledge || knowledge.length === 0) {
      throw new Error('No knowledge files or daily routines uploaded yet. Upload a syllabus, spec, photo, or habit notes first.');
    }

    const contextText = knowledge.map((item, idx) => {
      return `[Source ${idx + 1}: ${item.title} (${item.type})]\nContent: ${item.content}`;
    }).join('\n\n');

    const systemInstruction = 
      `You are Sky AI, an autonomous timetable and schedule management assistant.
      Your job is to analyze the user's uploaded documents, photos, and routine notes to generate:
      1. Timetable blocks with exact times (e.g. "08:00 AM", "10:30 AM", "02:00 PM")
      2. Actionable priority tasks with estimated minutes and priority badges (High, Medium, Low).
      3. Precise source citations linking each item to the uploaded document or routine name.
      You must respond ONLY with valid JSON conforming to this schema:
      {
        "executiveSummary": "brief overview of synthesized schedule",
        "items": [
          {
            "time": "09:00 AM",
            "title": "Task title",
            "durationMinutes": 45,
            "category": "Deep Work" | "Study" | "Meeting" | "Health" | "Routine" | "Agentic Action" | "General",
            "priority": "High" | "Medium" | "Low",
            "sourceCitation": "Title of uploaded source file or note",
            "isActionableTask": boolean,
            "notes": "optional details"
          }
        ]
      }`;

    const prompt = `Synthesize an optimized schedule from these user knowledge items:\n\n${contextText}`;

    try {
      const response = await this.generateText(prompt, systemInstruction);
      // Clean JSON delimiters if returned with markdown ```json ... ```
      const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed as GeneratedScheduleResponse;
      }
    } catch {
      // Fallback structured generation
    }

    return this.synthesizeScheduleLocally(knowledge);
  },

  /**
   * Generates context-aware suggested reply for an incoming WhatsApp message
   */
  async draftWhatsAppReply(message: string, senderName: string, knowledge: KnowledgeItem[]): Promise<string> {
    const knowledgeSummary = knowledge.length > 0 
      ? knowledge.map(k => `${k.title}: ${k.content.slice(0, 100)}`).join('; ')
      : 'User is managing schedule through Sky AI assistant.';

    const prompt = 
      `Incoming WhatsApp message from ${senderName}: "${message}"
      User's Schedule & Knowledge Context: ${knowledgeSummary}
      Draft a polite, concise, and helpful WhatsApp reply that directly addresses their message. Provide ONLY the reply text, with no extra conversational commentary or quotation marks.`;

    const reply = await this.generateText(prompt, 'You are Sky AI assistant drafting a WhatsApp reply on behalf of the user.');
    return reply.replace(/^"|"$/g, '').trim();
  },

  /**
   * Generates conversation script & responses for autonomous AI Phone Calls
   */
  async generatePhoneCallOpening(contactName: string, contextGoal: string): Promise<string> {
    const prompt = 
      `You are Sky AI, an autonomous phone assistant calling ${contactName} on behalf of the user.
      Specific Work Goal & Context: "${contextGoal}"
      Generate a professional, polite, and direct phone introduction stating who you are and clearly articulating the purpose of the call to ${contactName}.
      Keep it spoken-voice friendly and natural (2-3 sentences max).`;

    const script = await this.generateText(prompt, 'You are an autonomous AI phone calling agent.');
    return script.replace(/^"|"$/g, '').trim();
  },

  /**
   * Chat assistant response grounded in uploaded documents and timetable
   */
  async chatAssistant(
    userMessage: string, 
    knowledge: KnowledgeItem[], 
    schedule: ScheduleItem[],
    history: { sender: string; text: string }[]
  ): Promise<{ text: string; sources: string[] }> {
    const knowledgeText = knowledge.map(k => `[File/Routine: ${k.title}]: ${k.content}`).join('\n');
    const scheduleText = schedule.map(s => `- ${s.time} | ${s.title} (${s.category}, ${s.priority} priority, ${s.durationMinutes}m) [Citation: ${s.sourceCitation || 'Manual'}]`).join('\n');
    const historyText = history.slice(-6).map(h => `${h.sender === 'user' ? 'User' : 'Sky AI'}: ${h.text}`).join('\n');

    const prompt = 
      `You are Sky AI, a personal agentic AI assistant.
      
      User's Stored Knowledge Hub Files & Notes:
      ${knowledgeText || 'None uploaded yet.'}

      User's Current Schedule & Tasks:
      ${scheduleText || 'Empty schedule.'}

      Recent Chat History:
      ${historyText}

      User Query: "${userMessage}"

      Answer accurately, grounding your answers in their schedule, daily routines, and uploaded files. Cite your sources if relevant.`;

    const reply = await this.generateText(prompt, 'You are Sky AI, grounded in personal schedule and knowledge.');
    
    // Extract sources mentioned
    const sources: string[] = [];
    knowledge.forEach(k => {
      if (reply.toLowerCase().includes(k.title.toLowerCase()) || userMessage.toLowerCase().includes(k.title.toLowerCase())) {
        sources.push(k.title);
      }
    });

    return { text: reply, sources };
  },

  /**
   * Deterministic AI fallback when API key is not configured or offline
   */
  fallbackLocalGeneration(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('whatsapp') || lower.includes('reply')) {
      return "Hi, thanks for reaching out! I received your message and will check my schedule to get back to you shortly. Best regards.";
    }
    if (lower.includes('phone') || lower.includes('call') || lower.includes('vendor')) {
      return "Hello! This is Sky AI, an autonomous assistant calling on behalf of my user regarding your recent order. I'm calling to confirm the delivery schedule and explore any available commercial incentives. Could you please provide an update on current order status?";
    }
    if (lower.includes('schedule') || lower.includes('priority')) {
      return "Based on your active files, I recommend focusing on high-priority deep work blocks during morning peak hours, followed by collaborative tasks in the afternoon.";
    }
    return "I have reviewed your active schedule and knowledge files. Everything is structured to maximize focus and keep your automated workflows on track.";
  },

  /**
   * Generates realistic schedule items from uploaded files
   */
  synthesizeScheduleLocally(knowledge: KnowledgeItem[]): GeneratedScheduleResponse {
    const items: GeneratedScheduleResponse['items'] = [];
    let startHour = 8;

    knowledge.forEach((item) => {
      const cite = item.title;
      if (item.type === 'routine') {
        items.push({
          time: `${startHour.toString().padStart(2, '0')}:00 AM`,
          title: item.title,
          durationMinutes: 45,
          category: 'Routine',
          priority: 'Medium',
          sourceCitation: cite,
          isActionableTask: false,
          notes: item.content.slice(0, 100),
        });
        startHour += 1;
      } else if (item.type === 'document') {
        items.push({
          time: `${startHour.toString().padStart(2, '0')}:00 AM`,
          title: `Analyze ${item.title}`,
          durationMinutes: 90,
          category: 'Deep Work',
          priority: 'High',
          sourceCitation: cite,
          isActionableTask: true,
          notes: `Extracted from specs: ${item.content.slice(0, 80)}`,
        });
        startHour += 2;
        items.push({
          time: `${(startHour <= 12 ? startHour : startHour - 12).toString().padStart(2, '0')}:00 ${startHour >= 12 ? 'PM' : 'AM'}`,
          title: `Review deliverables for ${item.title}`,
          durationMinutes: 45,
          category: 'Study',
          priority: 'Medium',
          sourceCitation: cite,
          isActionableTask: true,
        });
        startHour += 1;
      } else {
        items.push({
          time: `${(startHour <= 12 ? startHour : startHour - 12).toString().padStart(2, '0')}:30 ${startHour >= 12 ? 'PM' : 'AM'}`,
          title: `Action items from image: ${item.title}`,
          durationMinutes: 30,
          category: 'Agentic Action',
          priority: 'Medium',
          sourceCitation: cite,
          isActionableTask: true,
        });
        startHour += 1;
      }
    });

    return {
      executiveSummary: `Generated ${items.length} intelligent timetable blocks and priority tasks derived from ${knowledge.length} knowledge sources.`,
      items,
    };
  }
};

