// ABOUTME: Observer pattern singleton for decoupled event-driven side effects.
// ABOUTME: Modules emit events (e.g., USER_REGISTERED); listeners react without direct coupling.

type EventListener = (data: unknown) => void | Promise<void>;

export const APP_EVENTS = {
  USER_REGISTERED: 'user.registered',
  EMAIL_VERIFIED: 'email.verified',
  OTP_SENT: 'otp.sent',
  COLLAB_ACCEPTED: 'collab.accepted',
} as const;

class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();

  on(event: string, listener: EventListener): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(event, [...existing, listener]);
  }

  off(event: string, listener: EventListener): void {
    const existing = this.listeners.get(event) || [];
    this.listeners.set(
      event,
      existing.filter((l) => l !== listener),
    );
  }

  async emit(event: string, data: unknown): Promise<void> {
    const listeners = this.listeners.get(event) || [];
    await Promise.all(listeners.map((l) => l(data)));
  }
}

export const eventBus = new EventBus();
