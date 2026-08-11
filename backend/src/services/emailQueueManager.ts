/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import { SmtpService } from './smtpService';
import { AiEmailGenerator } from './aiEmailGenerator';

export class EmailQueueManager {
  private smtpService: SmtpService;
  private aiGenerator: AiEmailGenerator;
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.smtpService = new SmtpService();
    this.aiGenerator = new AiEmailGenerator();
  }

  /**
   * Add a Job to the Email Queue (Database-First Architecture)
   */
  public async addJob(params: {
    tenantId: number;
    triggerEvent: string;
    recipient: string;
    payload: Record<string, any>;
    delayMinutes?: number;
    cartToken?: string;
  }): Promise<number> {
    const { tenantId, triggerEvent, recipient, payload, delayMinutes = 0, cartToken } = params;

    const offsetMs = delayMinutes > 0 ? delayMinutes * 60 * 1000 : -1000;
    const scheduledAt = new Date(Date.now() + offsetMs)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [res]: any = await sequelize.query(
      `INSERT INTO marketing_email_queue (
        tenant_id, store_id, trigger_event, recipient, payload_json, 
        scheduled_at, status, retry_count, cart_token, created_at, updated_at
      ) VALUES (
        :tenantId, 1, :triggerEvent, :recipient, :payloadJson, 
        :scheduledAt, 'pending', 0, :cartToken, NOW(), NOW()
      )`,
      {
        replacements: {
          tenantId,
          triggerEvent,
          recipient,
          payloadJson: JSON.stringify(payload),
          scheduledAt,
          cartToken: cartToken || null,
        },
      }
    );

    console.log(
      `[EmailQueue] Queued job #${res} (${triggerEvent}) for ${recipient} scheduled at ${scheduledAt}`
    );
    return res;
  }

  /**
   * Cancel Queued Job (e.g., if customer completes checkout before delay)
   */
  public async cancelJobsForCart(cartToken: string): Promise<number> {
    if (!cartToken) return 0;
    const [result]: any = await sequelize.query(
      `UPDATE marketing_email_queue 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE cart_token = :cartToken AND status IN ('pending', 'processing')`,
      { replacements: { cartToken } }
    );
    console.log(`[EmailQueue] Cancelled queued cart jobs for cart_token=${cartToken}`);
    return result.affectedRows || 0;
  }

  /**
   * Start Asynchronous Worker Interval
   */
  public startWorker(intervalMs = 15000): void {
    if (this.intervalId) return;
    console.log(
      `[EmailQueueWorker] Background queue worker active (polling every ${intervalMs / 1000}s)...`
    );
    this.intervalId = setInterval(() => this.processPendingJobs(), intervalMs);
    // Run immediately on boot
    this.processPendingJobs().catch((err) =>
      console.error('[EmailQueueWorker] Error in processPendingJobs:', err)
    );
  }

  /**
   * Stop Asynchronous Worker
   */
  public stopWorker(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process Pending & Due Queue Jobs (Database Queue Engine)
   */
  public async processPendingJobs(): Promise<{
    processed: number;
    success: number;
    failed: number;
  }> {
    if (this.isProcessing) return { processed: 0, success: 0, failed: 0 };
    this.isProcessing = true;

    let processed = 0;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Fetch pending jobs whose scheduled_at <= NOW() or retries due
      const jobs: any[] = await sequelize.query(
        `SELECT * FROM marketing_email_queue 
         WHERE status = 'pending' 
           AND (scheduled_at <= NOW() OR (next_retry_at IS NOT NULL AND next_retry_at <= NOW()))
         ORDER BY id ASC LIMIT 20`,
        { type: QueryTypes.SELECT }
      );

      for (const job of jobs) {
        processed++;

        // Mark processing
        await sequelize.query(
          `UPDATE marketing_email_queue SET status = 'processing', updated_at = NOW() WHERE id = :id`,
          { replacements: { id: job.id } }
        );

        let payload: Record<string, any> = {};
        try {
          payload = JSON.parse(job.payload_json || '{}');
        } catch {
          payload = {};
        }

        // Safety Check: For abandoned cart emails, check if customer completed an order in the meantime!
        if (job.trigger_event === 'cart_abandoned' && job.cart_token) {
          const [order]: any = await sequelize.query(
            `SELECT id FROM orders WHERE (id = :cartToken OR order_number = :cartToken) AND tenant_id = :tenantId LIMIT 1`,
            {
              replacements: { cartToken: job.cart_token, tenantId: job.tenant_id },
              type: QueryTypes.SELECT,
            }
          );

          if (order && order.id) {
            console.log(
              `[EmailQueueWorker] Customer completed order #${order.id}! Cancelling abandoned cart job #${job.id}`
            );
            await sequelize.query(
              `UPDATE marketing_email_queue SET status = 'cancelled', error_log = 'Order completed before dispatch', updated_at = NOW() WHERE id = :id`,
              { replacements: { id: job.id } }
            );
            continue;
          }
        }

        // Generate AI Email Content
        try {
          const aiContent = this.aiGenerator.generateTemplate({
            purpose: job.trigger_event,
            brand: payload.storeName || 'Comzilo Store',
            offer: payload.offer || '10% OFF with SAVE10',
          });

          const finalSubject = this.aiGenerator.interpolatePlaceholders(
            job.subject || aiContent.subject,
            payload
          );
          const finalHtml = this.aiGenerator.interpolatePlaceholders(aiContent.bodyHtml, payload);

          // Dispatch email via Nodemailer SMTP
          const sendRes = await this.smtpService.sendEmail({
            tenantId: job.tenant_id,
            to: job.recipient,
            subject: finalSubject,
            html: finalHtml,
            templateName: job.trigger_event,
          });

          // Mark Completed
          await sequelize.query(
            `UPDATE marketing_email_queue SET status = 'completed', updated_at = NOW() WHERE id = :id`,
            { replacements: { id: job.id } }
          );

          successCount++;
          console.log(
            `[EmailQueueWorker] Job #${job.id} (${job.trigger_event}) successfully sent to ${job.recipient}. MsgID: ${sendRes.messageId}`
          );
        } catch (err: any) {
          failedCount++;
          const errorMsg = err.message || String(err);
          const retryCount = (job.retry_count || 0) + 1;

          // Retry policy: 5m, 30m, 2h (max 3 retries)
          let delayMinutes = 5;
          if (retryCount === 2) delayMinutes = 30;
          if (retryCount === 3) delayMinutes = 120;

          if (retryCount <= 3) {
            const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000)
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ');

            await sequelize.query(
              `UPDATE marketing_email_queue 
               SET status = 'pending', retry_count = :retryCount, next_retry_at = :nextRetryAt, error_log = :errorMsg, updated_at = NOW() 
               WHERE id = :id`,
              { replacements: { retryCount, nextRetryAt, errorMsg, id: job.id } }
            );
            console.warn(
              `[EmailQueueWorker] Job #${job.id} failed (${errorMsg}). Scheduled Retry #${retryCount} at ${nextRetryAt}`
            );
          } else {
            // Max retries exceeded -> Mark Failed
            await sequelize.query(
              `UPDATE marketing_email_queue 
               SET status = 'failed', retry_count = :retryCount, error_log = :errorMsg, updated_at = NOW() 
               WHERE id = :id`,
              { replacements: { retryCount, errorMsg, id: job.id } }
            );
            console.error(
              `[EmailQueueWorker] Job #${job.id} permanently failed after 3 retries. Error: ${errorMsg}`
            );
          }
        }
      }
    } catch (err) {
      console.error('[EmailQueueWorker] Worker loop error:', err);
    } finally {
      this.isProcessing = false;
    }

    return { processed, success: successCount, failed: failedCount };
  }
}
