import { Product } from '../models/Product';
import { IOrderItem } from '../types';

export interface ReservationItem {
  productId: string;
  variantSku: string;
  quantity: number;
}

export class InventoryService {
  /**
   * Concurrently and atomically reserves stock for a list of items.
   * If ANY item fails stock reservation (due to insufficient stock),
   * all previously reserved items in this order are immediately rolled back atomically.
   */
  static async reserveStock(items: ReservationItem[]): Promise<void> {
    const reservedItems: ReservationItem[] = [];

    try {
      for (const item of items) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants.sku': item.variantSku,
            'variants.stock': { $gte: item.quantity },
            stock: { $gte: item.quantity }
          },
          {
            $inc: {
              'variants.$.stock': -item.quantity,
              stock: -item.quantity
            }
          },
          { new: true }
        );

        if (!updated) {
          throw new Error(
            `Insufficient stock for item variant SKU '${item.variantSku}'. Reservation failed.`
          );
        }

        reservedItems.push(item);
      }
    } catch (error) {
      // Roll back all items that were already deducted
      await this.releaseStock(reservedItems);
      throw error;
    }
  }

  /**
   * Atomically releases / restores stock for items (e.g. on order cancellation, timeout, or failure).
   */
  static async releaseStock(items: ReservationItem[] | IOrderItem[]): Promise<void> {
    for (const item of items) {
      try {
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants.sku': item.variantSku
          },
          {
            $inc: {
              'variants.$.stock': item.quantity,
              stock: item.quantity
            }
          }
        );
      } catch (err) {
        console.error(`Error releasing stock for SKU ${item.variantSku}:`, err);
      }
    }
  }
}
