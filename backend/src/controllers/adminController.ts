import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Payment } from '../models/Payment';

export const getAdminDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, range = '30d' } = req.query;

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    } else {
      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      dateFilter = {
        createdAt: {
          $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      };
    }

    // 1. Metric: Total Orders
    const totalOrders = await Order.countDocuments(dateFilter);

    // 2. Metric: Revenue (Orders that are PAID, PROCESSING, SHIPPED, DELIVERED)
    const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const revenueAgg = await Order.aggregate([
      { $match: { ...dateFilter, status: { $in: paidStatuses } } },
      { $group: { _id: null, totalRevenue: { $sum: '$pricing.finalTotal' } } }
    ]);
    const revenue = revenueAgg.length > 0 ? Math.round(revenueAgg[0].totalRevenue * 100) / 100 : 0;

    // 3. Metric: Pending Orders
    const pendingOrders = await Order.countDocuments({
      ...dateFilter,
      status: { $in: ['PENDING', 'PAYMENT_PROCESSING'] }
    });

    // 4. Metric: Failed Payments
    const failedPayments = await Payment.countDocuments({
      ...dateFilter,
      status: { $in: ['FAILED', 'TIMEOUT'] }
    });

    // 5. Metric: Low-Stock Products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).select('name sku stock lowStockThreshold basePrice variants category');

    // 6. Metric: Top Products by quantity sold
    const topProductsAgg = await Order.aggregate([
      { $match: { ...dateFilter, status: { $in: paidStatuses } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.itemTotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    // 7. Metric: Daily Sales Analytics for Charting
    const salesAnalytics = await Order.aggregate([
      { $match: { ...dateFilter, status: { $in: paidStatuses } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.finalTotal' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          ordersCount: 1,
          _id: 0
        }
      }
    ]);

    // 8. Recent 10 orders
    const recentOrders = await Order.find(dateFilter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders,
          revenue,
          pendingOrders,
          failedPayments
        },
        lowStockProducts,
        topProducts: topProductsAgg,
        salesAnalytics,
        recentOrders
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching admin dashboard.' });
  }
};
