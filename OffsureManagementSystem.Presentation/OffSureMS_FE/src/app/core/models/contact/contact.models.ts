export interface ContactMessageRequest {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  serviceCategory?: string | null;
}
