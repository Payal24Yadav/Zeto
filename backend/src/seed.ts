import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Product } from './models/Product';
import { Order } from './models/Order';
import { Payment } from './models/Payment';
import { Cart } from './models/Cart';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zeto_ecommerce';

export async function seedDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    console.log('[Seed] Connected to MongoDB');

    // Clean existing products and users to ensure fresh predictable state
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});

    console.log('[Seed] Cleared collections');

    const adminHash = await bcrypt.hash('Admin@123', 10);
    const customerHash = await bcrypt.hash('Customer@123', 10);

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@zeto.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      addresses: [
        {
          street: '100 Tech Park Way',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94107',
          country: 'USA',
          isDefault: true
        }
      ]
    });

    const superAdmin = await User.create({
      name: 'Super Administrator',
      email: 'superadmin@zeto.com',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      addresses: [
        {
          street: '1 Executive Loop',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          isDefault: true
        }
      ]
    });

    const customer = await User.create({
      name: 'Demo Customer',
      email: 'customer@zeto.com',
      passwordHash: customerHash,
      role: 'USER',
      addresses: [
        {
          street: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          postalCode: '97477',
          country: 'USA',
          isDefault: true
        }
      ]
    });

    console.log(`[Seed] Created users: ${admin.email} (ADMIN), ${customer.email} (USER)`);

    const products = [
      {
        name: 'ZETO Signature Organic T-Shirt',
        slug: 'zeto-signature-organic-tshirt',
        description: 'Ultra-soft 100% organic cotton t-shirt with premium tailored drape and reinforced seams.',
        category: 'Apparel',
        images: [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop'
        ],
        basePrice: 35.0,
        discountPercent: 10,
        sku: 'ZETO-TSHIRT-01',
        stock: 40,
        variants: [
          { sku: 'TS-BLK-S', size: 'Small', color: 'Black', price: 35.0, discountPercent: 10, stock: 5 },
          { sku: 'TS-BLK-M', size: 'Medium', color: 'Black', price: 35.0, discountPercent: 10, stock: 10 },
          { sku: 'TS-BLK-L', size: 'Large', color: 'Black', price: 35.0, discountPercent: 10, stock: 8 },
          { sku: 'TS-WHT-S', size: 'Small', color: 'White', price: 35.0, discountPercent: 10, stock: 5 },
          { sku: 'TS-WHT-M', size: 'Medium', color: 'White', price: 35.0, discountPercent: 10, stock: 12 }
        ],
        lowStockThreshold: 5
      },
      {
        name: 'Apex Thermal Pullover Hoodie',
        slug: 'apex-thermal-pullover-hoodie',
        description: 'Heavyweight brushed fleece hoodie in signature Zeto orange with spacious kangaroo pocket.',
        category: 'Apparel',
        images: [
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop'
        ],
        basePrice: 85.0,
        discountPercent: 15,
        sku: 'ZETO-HD-02',
        stock: 17,
        variants: [
          { sku: 'HD-ORG-S', size: 'Small', color: 'Orange', price: 85.0, discountPercent: 15, stock: 4 },
          { sku: 'HD-ORG-M', size: 'Medium', color: 'Orange', price: 85.0, discountPercent: 15, stock: 7 },
          { sku: 'HD-ORG-L', size: 'Large', color: 'Orange', price: 85.0, discountPercent: 15, stock: 6 }
        ],
        lowStockThreshold: 5
      },
      {
        name: 'Vanguard Velocity Pro Sneakers',
        slug: 'vanguard-velocity-pro-sneakers',
        description: 'Engineered responsive foam midsole sneakers built for high-performance city sprints and daily wear.',
        category: 'Footwear',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop'
        ],
        basePrice: 120.0,
        discountPercent: 0,
        sku: 'ZETO-SNK-03',
        stock: 18,
        variants: [
          { sku: 'SNK-BLK-M', size: 'Medium', color: 'Black', price: 120.0, discountPercent: 0, stock: 8 },
          { sku: 'SNK-ORG-M', size: 'Medium', color: 'Orange', price: 120.0, discountPercent: 0, stock: 10 }
        ],
        lowStockThreshold: 5
      },
      {
        name: 'Nomad Modular Waterproof Backpack',
        slug: 'nomad-modular-waterproof-backpack',
        description: 'Weatherproof 25L commuter backpack with padded 16-inch laptop compartment and magnetic quick-access latch.',
        category: 'Accessories',
        images: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop'
        ],
        basePrice: 95.0,
        discountPercent: 5,
        sku: 'ZETO-BAG-04',
        stock: 3, // Low stock on purpose for testing low stock alerts!
        variants: [
          { sku: 'BAG-BLK-L', size: 'Large', color: 'Black', price: 95.0, discountPercent: 5, stock: 3 }
        ],
        lowStockThreshold: 5
      },
      {
        name: 'AeroPulse ANC Wireless Headphones',
        slug: 'aeropulse-anc-wireless-headphones',
        description: 'Active Noise Cancellation with 40mm titanium drivers, transparency mode, and 38-hour battery longevity.',
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop'
        ],
        basePrice: 160.0,
        discountPercent: 20,
        sku: 'ZETO-HP-05',
        stock: 14,
        variants: [
          { sku: 'HP-BLK-M', size: 'Medium', color: 'Black', price: 160.0, discountPercent: 20, stock: 8 },
          { sku: 'HP-WHT-M', size: 'Medium', color: 'White', price: 160.0, discountPercent: 20, stock: 6 }
        ],
        lowStockThreshold: 5
      }
    ];

    for (const p of products) {
      await Product.create(p);
    }
    console.log(`[Seed] Successfully seeded ${products.length} products with size & color variants.`);

    // Create a mock initial order for dashboard analytics
    const sampleProduct = await Product.findOne({ sku: 'ZETO-TSHIRT-01' });
    if (sampleProduct) {
      const order = await Order.create({
        orderNumber: 'ORD-20261001-1001',
        userId: customer._id,
        items: [
          {
            productId: sampleProduct._id,
            variantSku: 'TS-BLK-M',
            name: sampleProduct.name,
            size: 'Medium',
            color: 'Black',
            quantity: 2,
            unitPrice: 35.0,
            discountPercent: 10,
            itemTotal: 63.0
          }
        ],
        pricing: {
          subtotal: 70.0,
          discountTotal: 7.0,
          tax: 6.3,
          shipping: 15.0,
          finalTotal: 84.3
        },
        shippingAddress: customer.addresses[0],
        status: 'DELIVERED',
        statusHistory: [
          { status: 'PENDING', timestamp: new Date(Date.now() - 4 * 86400000) },
          { status: 'PAID', timestamp: new Date(Date.now() - 4 * 86400000 + 1000) },
          { status: 'PROCESSING', timestamp: new Date(Date.now() - 3 * 86400000) },
          { status: 'SHIPPED', timestamp: new Date(Date.now() - 2 * 86400000) },
          { status: 'DELIVERED', timestamp: new Date(Date.now() - 1 * 86400000) }
        ],
        reservationExpiresAt: new Date(Date.now() - 4 * 86400000 + 900000)
      });

      await Payment.create({
        orderId: order._id,
        transactionId: 'TXN-INIT-001',
        amount: 84.3,
        currency: 'USD',
        status: 'SUCCESS',
        webhookDelivered: true,
        webhookDeliveredAt: new Date(Date.now() - 4 * 86400000 + 1000)
      });
    }

    console.log('[Seed] Database initialization completed successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}
