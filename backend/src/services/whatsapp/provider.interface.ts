/* eslint-disable @typescript-eslint/no-explicit-any */
export interface WhatsAppMessageResponse {
  success: boolean;
  messageId: string;
  providerReference: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
  rawResponse?: any;
}

export interface IWhatsAppProvider {
  sendTextMessage(to: string, message: string, options?: any): Promise<WhatsAppMessageResponse>;
  sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: Record<string, any>,
    options?: any
  ): Promise<WhatsAppMessageResponse>;
  testConnection(config: any): Promise<boolean>;
}
