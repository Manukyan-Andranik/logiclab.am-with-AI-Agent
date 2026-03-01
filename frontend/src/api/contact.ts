import { apiClient } from "./client";

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export const contactApi = {
  submitForm: (data: ContactFormData) =>
    apiClient<{ message: string; message_id: number }>("/contact-messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
