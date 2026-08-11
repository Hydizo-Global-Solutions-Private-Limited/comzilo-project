/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseService } from '../core/BaseService';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationTemplateRepository } from '../repositories/notificationTemplate.repository';
import { TemplateService } from './template.service';
import { PreferenceService } from './preference.service';
import { QueueService } from './queue.service';
import { ManualNotificationProvider } from './notification/manual.provider';
import { Notification } from '../database/models/notification';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { NotificationResult } from './notification/provider.interface';

export class NotificationService extends BaseService {
  private notificationRepo = new NotificationRepository();
  private templateRepo = new NotificationTemplateRepository();
  private templateService = new TemplateService();
  private preferenceService = new PreferenceService();
  private queueService = new QueueService();
  private provider = new ManualNotificationProvider();

  constructor() {
    super('NotificationService');
  }

  public async createNotification(tenantIdOrData: any, dataPayload?: any): Promise<Notification> {
    const tenantId =
      typeof tenantIdOrData === 'number' ? tenantIdOrData : tenantIdOrData?.tenantId || 1;
    const data = typeof tenantIdOrData === 'number' ? dataPayload : tenantIdOrData;
    return this.sendNotification(tenantId, data?.storeId || 1, data || {});
  }

  /**
   * Main Notification Dispatch Engine.
   */
  public async sendNotification(
    tenantId: number,
    storeId: number | null,
    data: {
      userId?: number | null;
      recipient: string;
      channel: 'email' | 'sms' | 'push' | 'in_app' | 'whatsapp';
      title?: string;
      content?: string;
      templateCode?: string;
      variables?: Record<string, any>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      payload?: Record<string, any>;
    }
  ): Promise<Notification> {
    const { userId, channel, priority = 'normal', payload } = data;
    const recipient =
      data.recipient || (userId ? `user-${userId}@comzilo.com` : 'system@comzilo.com');

    // Check Preference if userId provided
    if (userId) {
      const isAllowed = await this.preferenceService.isChannelAllowed(tenantId, userId, channel);
      if (!isAllowed) {
        throw new ValidationError(
          `Channel '${channel}' is disabled in user notification preferences.`
        );
      }
    }

    let title = data.title || '';
    let content = data.content || '';
    let templateId: number | null = null;

    // Load template if code provided
    if (data.templateCode) {
      const template = await this.templateRepo.findByCode(tenantId, storeId, data.templateCode);
      if (template) {
        templateId = template.id;
        title = template.subject
          ? this.templateService.compileTemplate(template.subject, data.variables)
          : title;
        content = this.templateService.compileTemplate(template.body, data.variables);
      }
    }

    if (!content && data.variables) {
      content = this.templateService.compileTemplate(content, data.variables);
    }

    // Execute provider sending
    let sendResult: NotificationResult = { success: false, response: null, error: undefined };
    try {
      if (channel === 'email') {
        sendResult = await this.provider.sendEmail(recipient, title, content, payload);
      } else if (channel === 'sms') {
        sendResult = await this.provider.sendSMS(recipient, content, payload);
      } else if (channel === 'push') {
        sendResult = await this.provider.sendPush(recipient, title, content, payload);
      } else if (channel === 'whatsapp') {
        sendResult = await this.provider.sendWhatsApp(recipient, content, payload);
      } else if (channel === 'in_app') {
        sendResult = { success: true, response: { channel: 'in_app' } };
      }
    } catch (err: any) {
      sendResult = { success: false, response: null, error: err.message };
    }

    const status = sendResult.success ? (channel === 'in_app' ? 'pending' : 'sent') : 'failed';

    const notification = await this.notificationRepo.model.create({
      tenantId,
      storeId,
      userId: userId || null,
      recipient,
      channel,
      status,
      priority,
      templateId,
      title: title || null,
      content,
      payload: payload || null,
      response: sendResult.response || null,
      error: sendResult.error || null,
      sentAt: sendResult.success ? new Date() : null,
      scheduledAt: null,
      readAt: null,
    });

    if (!sendResult.success) {
      await this.queueService.enqueue(tenantId, storeId, notification.id);
    }

    return notification;
  }

  /**
   * Helper to trigger domain event notifications.
   */
  public async triggerEventNotification(
    tenantId: number,
    storeId: number | null,
    eventName: string,
    recipient: string,
    variables: Record<string, any>,
    userId?: number | null
  ): Promise<Notification> {
    return this.sendNotification(tenantId, storeId, {
      userId,
      recipient,
      channel: 'email',
      templateCode: eventName.toLowerCase(),
      title: `${eventName.replace(/_/g, ' ')} Notification`,
      content: `Notification for event ${eventName}. Details: ${JSON.stringify(variables)}`,
      variables,
    });
  }

  /**
   * In-App Notifications API Helpers
   */
  public async listInAppNotifications(
    tenantId: number,
    userId: number,
    query: any = {}
  ): Promise<{ rows: Notification[]; count: number }> {
    const { page = 1, limit = 20 } = query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await this.notificationRepo.model.findAndCountAll({
      where: { tenantId, userId, channel: 'in_app' },
      order: [['id', 'DESC']],
      limit: Number(limit),
      offset,
    });

    return { rows, count };
  }

  public async getUnreadCount(tenantId: number, userId: number): Promise<number> {
    return this.notificationRepo.getUnreadCount(tenantId, userId);
  }

  public async markAsRead(tenantId: number, userId: number, id: number): Promise<Notification> {
    const notif = await this.notificationRepo.model.findOne({ where: { tenantId, userId, id } });
    if (!notif) {
      throw new NotFoundError(`Notification with ID ${id} not found.`);
    }
    return notif.update({ status: 'read', readAt: new Date() });
  }

  public async markAllAsRead(tenantId: number, userId: number): Promise<{ updatedCount: number }> {
    const [updatedCount] = await this.notificationRepo.markAllAsRead(tenantId, userId);
    return { updatedCount };
  }

  public async deleteNotification(tenantId: number, userId: number, id: number): Promise<void> {
    const notif = await this.notificationRepo.model.findOne({ where: { tenantId, userId, id } });
    if (!notif) {
      throw new NotFoundError(`Notification with ID ${id} not found.`);
    }
    await notif.destroy();
  }
}
