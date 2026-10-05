import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { InventoryService } from './inventoryService';

export class BackgroundWorker {
  private static timer: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 30000): void {
    console.log('[BackgroundWorker] Initialized queue & scheduled jobs...');
    this.timer = setInterval(async () => {
      await this.releaseExpiredReservations();
      await this.checkAbandonedCarts();
    }, intervalMs);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Release inventory reservations that expired without being paid.
   */
  static async releaseExpiredReservations(): Promise<number> {
    try {
      const now = new Date();
      const expiredOrders = await Order.find({
        status: { $in: ['PENDING', 'PAYMENT_PROCESSING'] },
        reservationExpiresAt: { $lt: now }
      });

      let releasedCount = 0;
      for (const order of expiredOrders) {
        console.log(`[BackgroundWorker] Expired reservation found for Order ${order.orderNumber}. Releasing stock...`);
        await InventoryService.releaseStock(
          order.items.map((i) => ({
            productId: i.productId.toString(),
            variantSku: i.variantSku,
            quantity: i.quantity
          }))
        );

        order.status = 'CANCELLED';
        order.statusHistory.push({
          status: 'CANCELLED',
          timestamp: new Date(),
          note: 'Automatic cancellation due to reservation expiration (Timeout)'
        });
        await order.save();
        releasedCount++;
      }

      if (releasedCount > 0) {
        console.log(`[BackgroundWorker] Successfully released stock for ${releasedCount} expired order(s).`);
      }
      return releasedCount;
    } catch (err) {
      console.error('[BackgroundWorker] Error in releaseExpiredReservations:', err);
      return 0;
    }
  }

  /**
   * Detect abandoned carts (updated > 2 hours ago with active items).
   */
  static async checkAbandonedCarts(): Promise<number> {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const abandonedCarts = await Cart.find({
        'items.0': { $exists: true },
        updatedAt: { $lt: twoHoursAgo }
      });

      if (abandonedCarts.length > 0) {
        // Log simulation of abandoned cart recovery notification
        console.log(
          `[BackgroundWorker] Detected ${abandonedCarts.length} abandoned cart(s). Queuing recovery email reminders.`
        );
      }
      return abandonedCarts.length;
    } catch (err) {
      console.error('[BackgroundWorker] Error checking abandoned carts:', err);
      return 0;
    }
  }

  /**
   * Simulate sending order confirmation email.
   */
  static async sendOrderConfirmationEmail(orderId: string, email: string): Promise<void> {
    console.log(`[EmailWorker] Dispatched order confirmation email for Order ID ${orderId} to <${email}>.`);
  }
}
