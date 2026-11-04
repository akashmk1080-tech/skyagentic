type ModalType = 'knowledge_hub' | 'supabase_config';
type Listener = () => void;

class ModalEventManager {
  private listeners: { [key in ModalType]?: Listener[] } = {};

  public subscribe(type: ModalType, listener: Listener): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type]!.push(listener);
    return () => {
      this.listeners[type] = this.listeners[type]?.filter(l => l !== listener);
    };
  }

  public open(type: ModalType) {
    if (this.listeners[type]) {
      this.listeners[type]!.forEach(l => l());
    }
  }
}

export const ModalEvents = new ModalEventManager();

