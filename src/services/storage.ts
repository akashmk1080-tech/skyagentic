import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  KnowledgeItem, 
  ScheduleItem, 
  AutomatedTask, 
  ReplyRecord, 
  WhatsAppMessage, 
  ChatMessage, 
  AppSettings 
} from '../types';

const STORAGE_KEYS = {
  KNOWLEDGE: '@sky_knowledge_items_v1',
  SCHEDULE: '@sky_schedule_items_v1',
  AUTOMATED_TASKS: '@sky_automated_tasks_v1',
  REPLIES: '@sky_replies_archive_v1',
  WHATSAPP_MESSAGES: '@sky_whatsapp_messages_v1',
  SETTINGS: '@sky_app_settings_v1',
  CHAT_MESSAGES: '@sky_chat_messages_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://isnjgvzrtrywslssjykg.supabase.co',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X2rD4nPQDCdtC2VD6teQJg_D8FbvKhA',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  geminiModel: 'gemini-2.5-flash',
  autoSpeakTTS: false,
  ttsVoicePitch: 1.0,
  ttsVoiceRate: 1.0,
};

export const StorageService = {
  // Knowledge Hub
  async getKnowledge(): Promise<KnowledgeItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.KNOWLEDGE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem[]> {
    const list = await this.getKnowledge();
    const updated = [item, ...list.filter(k => k.id !== item.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(updated));
    return updated;
  },

  async deleteKnowledgeItem(id: string): Promise<KnowledgeItem[]> {
    const list = await this.getKnowledge();
    const updated = list.filter(k => k.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(updated));
    return updated;
  },

  // Schedule & Actionable Tasks
  // Initial state is clean - no fake placeholder tasks
  async getSchedule(): Promise<ScheduleItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveSchedule(items: ScheduleItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(items));
  },

  async addScheduleItems(newItems: ScheduleItem[]): Promise<ScheduleItem[]> {
    const current = await this.getSchedule();
    const updated = [...newItems, ...current];
    await this.saveSchedule(updated);
    return updated;
  },

  async toggleScheduleTask(id: string): Promise<ScheduleItem[]> {
    const list = await this.getSchedule();
    const updated = list.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    await this.saveSchedule(updated);
    return updated;
  },

  async deleteScheduleItem(id: string): Promise<ScheduleItem[]> {
    const list = await this.getSchedule();
    const updated = list.filter(item => item.id !== id);
    await this.saveSchedule(updated);
    return updated;
  },

  // Automated Tasks
  async getAutomatedTasks(): Promise<AutomatedTask[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTOMATED_TASKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveAutomatedTask(task: AutomatedTask): Promise<AutomatedTask[]> {
    const list = await this.getAutomatedTasks();
    const updated = [task, ...list.filter(t => t.id !== task.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.AUTOMATED_TASKS, JSON.stringify(updated));
    return updated;
  },

  async updateAutomatedTaskStatus(id: string, status: AutomatedTask['status']): Promise<AutomatedTask[]> {
    const list = await this.getAutomatedTasks();
    const updated = list.map(t => t.id === id ? { ...t, status, lastExecutedAt: new Date().toISOString() } : t);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTOMATED_TASKS, JSON.stringify(updated));
    return updated;
  },

  async deleteAutomatedTask(id: string): Promise<AutomatedTask[]> {
    const list = await this.getAutomatedTasks();
    const updated = list.filter(t => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTOMATED_TASKS, JSON.stringify(updated));
    return updated;
  },

  // Replies & Call Records Archive
  async getReplies(): Promise<ReplyRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REPLIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addReplyRecord(record: ReplyRecord): Promise<ReplyRecord[]> {
    const list = await this.getReplies();
    const updated = [record, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.REPLIES, JSON.stringify(updated));
    return updated;
  },

  async deleteReplyRecord(id: string): Promise<ReplyRecord[]> {
    const list = await this.getReplies();
    const updated = list.filter(r => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.REPLIES, JSON.stringify(updated));
    return updated;
  },

  // WhatsApp Messages
  async getWhatsAppMessages(): Promise<WhatsAppMessage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WHATSAPP_MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveWhatsAppMessages(messages: WhatsAppMessage[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.WHATSAPP_MESSAGES, JSON.stringify(messages));
  },

  async addWhatsAppMessage(msg: WhatsAppMessage): Promise<WhatsAppMessage[]> {
    const current = await this.getWhatsAppMessages();
    const updated = [msg, ...current.filter(m => m.id !== msg.id)];
    await this.saveWhatsAppMessages(updated);
    return updated;
  },

  async markWhatsAppMessageRead(id: string): Promise<WhatsAppMessage[]> {
    const current = await this.getWhatsAppMessages();
    const updated = current.map(m => m.id === id ? { ...m, unread: false } : m);
    await this.saveWhatsAppMessages(updated);
    return updated;
  },

  async updateWhatsAppSuggestedReply(id: string, suggestedReply: string): Promise<WhatsAppMessage[]> {
    const current = await this.getWhatsAppMessages();
    const updated = current.map(m => m.id === id ? { ...m, suggestedReply, isDraftingReply: false } : m);
    await this.saveWhatsAppMessages(updated);
    return updated;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Chat Messages
  async getChatMessages(): Promise<ChatMessage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveChatMessage(msg: ChatMessage): Promise<ChatMessage[]> {
    const current = await this.getChatMessages();
    const updated = [...current, msg];
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(updated));
    return updated;
  },

  async clearChatMessages(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
  },
};

