export interface TimelineEvent {
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  display_time: string;
}

export interface TimelinePayload {
  events: TimelineEvent[];
}
