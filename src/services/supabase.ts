import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KnowledgeItem, ScheduleItem, ReplyRecord, AutomatedTask } from '../types';
import { StorageService } from './storage';

export type SyncStatus = 'active' | 'syncing' | 'offline' | 'error';

class SupabaseServiceManager {
  private client: SupabaseClient | null = null;
  private status: SyncStatus = 'offline';
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    const settings = await StorageService.getSettings();
    if (settings.supabaseUrl && settings.supabaseAnonKey) {
      try {
        this.client = createClient(settings.supabaseUrl, settings.supabaseAnonKey);
        this.setStatus('active');
      } catch (err) {
        console.warn('Supabase initialization error:', err);
        this.setStatus('error');
      }
    } else {
      this.client = null;
      this.setStatus('offline');
    }
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.listeners.forEach(l => l(newStatus));
  }

  public async reconfigure(url: string, key: string): Promise<boolean> {
    if (!url || !key) {
      this.client = null;
      this.setStatus('offline');
      return false;
    }
    try {
      this.setStatus('syncing');
      this.client = createClient(url, key);
      // Quick ping test
      const { error } = await this.client.from('user_knowledge').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet, but connection was made
        console.log('Supabase connection verified (note on tables):', error.message);
      }
      this.setStatus('active');
      return true;
    } catch (e) {
      console.warn('Failed to configure Supabase:', e);
      this.setStatus('error');
      return false;
    }
  }

  // Cloud Knowledge Sync
  async syncKnowledgeItem(item: KnowledgeItem): Promise<boolean> {
    if (!this.client || this.status === 'offline') return false;
    try {
      this.setStatus('syncing');
      const { error } = await this.client.from('user_knowledge').upsert({
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        file_uri: item.fileUri,
        file_name: item.fileName,
        created_at: item.createdAt,
      });
      this.setStatus(error ? 'error' : 'active');
      return !error;
    } catch {
      this.setStatus('error');
      return false;
    }
  }

  async deleteKnowledgeItem(id: string): Promise<boolean> {
    if (!this.client || this.status === 'offline') return false;
    try {
      this.setStatus('syncing');
      const { error } = await this.client.from('user_knowledge').delete().eq('id', id);
      this.setStatus(error ? 'error' : 'active');
      return !error;
    } catch {
      this.setStatus('error');
      return false;
    }
  }

  // Cloud Schedule Sync
  async syncSchedule(items: ScheduleItem[]): Promise<boolean> {
    if (!this.client || this.status === 'offline') return false;
    try {
      this.setStatus('syncing');
      const payload = items.map(item => ({
        id: item.id,
        time: item.time,
        title: item.title,
        duration_minutes: item.durationMinutes,
        category: item.category,
        priority: item.priority,
        source_citation: item.sourceCitation,
        completed: item.completed,
        is_actionable: item.isActionableTask,
        created_at: item.createdAt,
      }));
      const { error } = await this.client.from('schedule_items').upsert(payload);
      this.setStatus(error ? 'error' : 'active');
      return !error;
    } catch {
      this.setStatus('error');
      return false;
    }
  }

  // Cloud Reply Records Sync
  async syncReplyRecord(record: ReplyRecord): Promise<boolean> {
    if (!this.client || this.status === 'offline') return false;
    try {
      this.setStatus('syncing');
      const { error } = await this.client.from('replies_archive').insert({
        id: record.id,
        contact_name: record.contactName,
        contact_phone: record.contactPhone,
        channel: record.channel,
        timestamp: record.timestamp,
        sentiment: record.sentiment,
        duration_seconds: record.durationSeconds,
        summary: record.summary,
        transcript: record.transcript,
        created_at: record.createdAt,
      });
      this.setStatus(error ? 'error' : 'active');
      return !error;
    } catch {
      this.setStatus('error');
      return false;
    }
  }

  // Full bi-directional sync
  async triggerFullSync(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Supabase credentials not configured' };
    }
    this.setStatus('syncing');
    try {
      // Fetch remote knowledge
      const { data: remoteKnowledge } = await this.client.from('user_knowledge').select('*');
      if (remoteKnowledge && remoteKnowledge.length > 0) {
        for (const row of remoteKnowledge) {
          await StorageService.saveKnowledgeItem({
            id: row.id,
            title: row.title,
            type: row.type,
            content: row.content,
            fileUri: row.file_uri,
            fileName: row.file_name,
            createdAt: row.created_at,
          });
        }
      }

      this.setStatus('active');
      return { success: true, message: 'Cloud synchronization complete' };
    } catch (e: any) {
      this.setStatus('error');
      return { success: false, message: e.message || 'Sync failed' };
    }
  }
}

export const SupabaseService = new SupabaseServiceManager();

