export type PriorityLevel = 'High' | 'Medium' | 'Low';

export type TaskCategory = 
  | 'Deep Work' 
  | 'Study' 
  | 'Meeting' 
  | 'Health' 
  | 'Routine' 
  | 'Agentic Action' 
  | 'General';

export interface ScheduleItem {
  id: string;
  time: string; // e.g. "09:00 AM"
  timestamp: number; // for sorting
  title: string;
  durationMinutes: number;
  category: TaskCategory;
  priority: PriorityLevel;
  sourceCitation?: string; // e.g. "Syllabus Week 4 PDF", "Daily Routine Note"
  completed: boolean;
  isActionableTask: boolean;
  notes?: string;
  createdAt: string;
}

export type KnowledgeType = 'photo' | 'document' | 'routine';

export interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string; // text content or base64 or file description
  fileUri?: string;
  fileName?: string;
  fileSize?: string;
  tags?: string[];
  createdAt: string;
}

export type AgenticMode = 'Agentic AI' | 'Manual Mode';

export type AutomatedChannel = 'Phone Call' | 'WhatsApp' | 'Gmail';

export type TaskStatus = 'Scheduled' | 'Executing' | 'Completed' | 'Failed' | 'Draft';

export interface AutomatedTask {
  id: string;
  title: string;
  contactName: string;
  contactPhone: string;
  channel: AutomatedChannel;
  scheduledTime: string; // "14:30" or "02:30 PM"
  scheduledHour: number; // 1-12
  scheduledMinute: number; // 0-59
  scheduledPeriod: 'AM' | 'PM';
  contextGoal: string; // e.g. "Ask vendor to confirm delivery date and negotiate a 10% discount"
  mode: AgenticMode;
  status: TaskStatus;
  createdAt: string;
  lastExecutedAt?: string;
}

export type SentimentType = 'Positive' | 'Urgent' | 'Neutral';

export interface ReplyRecord {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: 'Call' | 'WhatsApp';
  timestamp: string;
  sentiment: SentimentType;
  durationSeconds?: number;
  summary: string;
  transcript: string;
  actionTaken?: string;
  createdAt: string;
}

export interface WhatsAppMessage {
  id: string;
  senderName: string;
  senderPhone: string;
  messageText: string;
  timestamp: string;
  unread: boolean;
  suggestedReply?: string;
  isDraftingReply?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'sky';
  text: string;
  timestamp: string;
  groundingSources?: string[];
}

export interface DeviceContact {
  id: string;
  name: string;
  phoneNumber: string;
  avatarColor?: string;
}

export interface AppSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  geminiModel: string;
  autoSpeakTTS: boolean;
  ttsVoicePitch: number;
  ttsVoiceRate: number;
}

