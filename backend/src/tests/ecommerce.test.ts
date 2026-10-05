import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { IdempotencyRecord } from '../models/IdempotencyRecord';
import { canTransition, validateTransition } from '../utils/stateMachine';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zeto_ecommerce_test';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_zeto_ecommerce_2026';

let customerToken: string;
let customerId: string;
let adminToken: string;
let superAdminToken: string;
let testProduct: any;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
  // Clear test DB
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await IdempotencyRecord.deleteMany({});

  const hash = await bcrypt.hash('Password123!', 10);

  // 1. Setup Admin directly via DB (privileged provision)
  const adminUser = await User.create({
    name: 'Admin Test',
    email: 'admin_test@zeto.com',
    passwordHash: hash,
    role: 'ADMIN',
    addresses: []
  });
  adminToken = jwt.sign({ id: adminUser._id.toString(), role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });

  // 2. Setup SuperAdmin directly via DB
  const superAdminUser = await User.create({
    name: 'Super Admin Test',
    email: 'superadmin_test@zeto.com',
    passwordHash: hash,
    role: 'SUPER_ADMIN',
    addresses: []
  });
  superAdminToken = jwt.sign({ id: superAdminUser._id.toString(), role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '7d' });

  // 3. Setup Customer
  const custRes = await request(app).post('/api/auth/register').send({
    name: 'Customer Test',
    email: 'customer_test@zeto.com',
    password: 'Password123!'
  });
  customerToken = custRes.body.data.token;
  customerId = custRes.body.data.user.id;

  // 3. Create a Test Product with stock = 5 for concurrency test
  testProduct = await Product.create({
    name: 'Limited Edition Sneakers',
    slug: 'limited-edition-sneakers',
    description: 'High-demand limited release sneaker',
    category: 'Footwear',
    basePrice: 100,
    discountPercent: 10,
    sku: 'CONCURRENCY-SNK-01',
    stock: 5,
    variants: [
      {
        sku: 'CONC-SZ-9',
        size: 'Medium',
        color: 'Black',
        price: 100,
        discountPercent: 10,
        stock: 5
      }
    ],
    lowStockThreshold: 5
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('1. Authentication & Authorization Suite', () => {
  it('should successfully register a user and hash password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePassword123'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  it('should reject duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Duplicate',
      email: 'jane@example.com',
      password: 'SecurePassword123'
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should log in an existing user with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'customer_test@zeto.com',
      password: 'Password123!'
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject unauthorized access to Admin Dashboard by standard customer', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Administrator privileges required/i);
  });

  it('should allow admin access to Admin Dashboard', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  it('should prevent privilege escalation: public register with role ADMIN must still assign USER', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker Attempt',
      email: 'hacker@example.com',
      password: 'SecurePassword123',
      role: 'ADMIN' // Client trying to escalate privilege
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER'); // Must be strictly USER

    // Ensure this user cannot access admin APIs
    const checkRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(checkRes.status).toBe(403);
  });

  it('should allow SUPER_ADMIN role access to Admin Dashboard and admin APIs', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });
});

describe('2. Inventory Concurrency & Zero-Overselling Suite', () => {
  it('should allow exactly 5 orders when 20 concurrent requests compete for 5 units of stock', async () => {
    const orderPayload = {
      items: [
        {
          productId: testProduct._id.toString(),
          variantSku: 'CONC-SZ-9',
          quantity: 1
        }
      ],
      shippingAddress: {
        street: '123 Speed Way',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      }
    };

    // Fire 20 simultaneous requests
    const promises = Array.from({ length: 20 }, (_, idx) =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ ...orderPayload, idempotencyKey: `CONC-REQ-${idx}-${Date.now()}` })
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.status === 201).length;
    const failedCount = results.filter((r) => r.status === 400).length;

    expect(successCount).toBe(5);
    expect(failedCount).toBe(15);

    // Verify product stock in MongoDB: Must be exactly 0, NEVER negative
    const updatedProd = await Product.findById(testProduct._id);
    expect(updatedProd?.stock).toBe(0);
    expect(updatedProd?.variants[0].stock).toBe(0);
  });

  it('should rollback earlier reserved items if a later item in multi-item order fails stock check', async () => {
    // Restock product A with 3 units
    const prodA = await Product.create({
      name: 'Item A',
      slug: 'item-a-rollback',
      description: 'Desc',
      category: 'General',
      basePrice: 50,
      sku: 'ROLL-A',
      stock: 3,
      variants: [{ sku: 'VAR-A', size: 'Medium', color: 'Black', price: 50, stock: 3, discountPercent: 0 }]
    });

    // Product B has 0 units (out of stock)
    const prodB = await Product.create({
      name: 'Item B',
      slug: 'item-b-rollback',
      description: 'Desc',
      category: 'General',
      basePrice: 70,
      sku: 'ROLL-B',
      stock: 0,
      variants: [{ sku: 'VAR-B', size: 'Medium', color: 'Black', price: 70, stock: 0, discountPercent: 0 }]
    });

    // Attempt order with 1x Item A and 1x Item B
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { productId: prodA._id.toString(), variantSku: 'VAR-A', quantity: 1 },
          { productId: prodB._id.toString(), variantSku: 'VAR-B', quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Rollback St',
          city: 'Safetyville',
          state: 'CA',
          postalCode: '90001',
          country: 'USA'
        }
      });

    expect(res.status).toBe(400);

    // Verify Item A stock was NOT depleted (safely rolled back to 3)
    const checkA = await Product.findById(prodA._id);
    expect(checkA?.stock).toBe(3);
    expect(checkA?.variants[0].stock).toBe(3);
  });
});

describe('3. Checkout Pricing & Rule-Based Shipping Engine', () => {
  it('should calculate Subtotal - Discount + Tax + Shipping correctly on backend', async () => {
    // Create product with price 40, discount 25% (net $30 each). 2 units = $60 net.
    // Since $60 < $100 threshold, shipping must be $15. Tax = 10% of $60 = $6. Final = $81.
    const priceProd = await Product.create({
      name: 'Discount Item',
      slug: 'discount-item-pricing',
      description: 'Test pricing',
      category: 'Apparel',
      basePrice: 40,
      discountPercent: 25,
      sku: 'PRICE-CHK-01',
      stock: 10,
      variants: [{ sku: 'P-VAR-1', size: 'Medium', color: 'Orange', price: 40, discountPercent: 25, stock: 10 }]
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: priceProd._id.toString(), variantSku: 'P-VAR-1', quantity: 2 }],
        shippingAddress: { street: 'Main St', city: 'City', state: 'ST', postalCode: '12345', country: 'USA' }
      });

    expect(res.status).toBe(201);
    const pricing = res.body.data.pricing;
    expect(pricing.subtotal).toBe(80); // 40 * 2
    expect(pricing.discountTotal).toBe(20); // 25% of 80
    expect(pricing.shipping).toBe(15); // Net 60 < 100 threshold => $15
    expect(pricing.tax).toBe(6); // 10% of 60
    expect(pricing.finalTotal).toBe(81); // 60 + 6 + 15
  });
});

describe('4. Order State Machine & Transition Rejections', () => {
  it('should reject invalid transition: DELIVERED -> PENDING', () => {
    expect(canTransition('DELIVERED', 'PENDING')).toBe(false);
    expect(() => validateTransition('DELIVERED', 'PENDING')).toThrow(/Invalid order status transition/i);
  });

  it('should reject invalid transition: CANCELLED -> PAID', () => {
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
    expect(() => validateTransition('CANCELLED', 'PAID')).toThrow();
  });

  it('should accept valid transition: PENDING -> PAYMENT_PROCESSING -> PAID -> PROCESSING -> SHIPPED -> DELIVERED', () => {
    expect(canTransition('PENDING', 'PAYMENT_PROCESSING')).toBe(true);
    expect(canTransition('PAYMENT_PROCESSING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'PROCESSING')).toBe(true);
    expect(canTransition('PROCESSING', 'SHIPPED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
  });
});

describe('5. Idempotency Key Engine', () => {
  it('should return identical response and not duplicate orders on replay of same Idempotency-Key', async () => {
    const singleProduct = await Product.create({
      name: 'Unique Item',
      slug: 'unique-item-idemp',
      description: 'Test idemp',
      category: 'Electronics',
      basePrice: 50,
      sku: 'IDEMP-TEST-SKU',
      stock: 10,
      variants: [{ sku: 'IDEMP-VAR', size: 'Large', color: 'White', price: 50, stock: 10, discountPercent: 0 }]
    });

    const idempotencyKey = `IDEMP-KEY-${Date.now()}`;
    const payload = {
      items: [{ productId: singleProduct._id.toString(), variantSku: 'IDEMP-VAR', quantity: 1 }],
      shippingAddress: { street: '1 Test Way', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' }
    };

    // First request
    const firstRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(firstRes.status).toBe(201);
    const orderId1 = firstRes.body.data._id;

    // Second request with exact same Idempotency-Key
    const secondRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(secondRes.status).toBe(201);
    expect(secondRes.header['x-idempotent-replay']).toBe('true');
    expect(secondRes.body.data._id).toBe(orderId1);

    // Verify stock was deducted only ONCE (from 10 to 9, NOT 8)
    const checkProduct = await Product.findById(singleProduct._id);
    expect(checkProduct?.stock).toBe(9);
  });
});

describe('6. Mock Payment Outcomes & Idempotent Webhook', () => {
  let payOrder: any;

  beforeAll(async () => {
    const payProd = await Product.create({
      name: 'Pay Item',
      slug: 'pay-item',
      description: 'Desc',
      category: 'General',
      basePrice: 120,
      sku: 'PAY-PROD',
      stock: 5,
      variants: [{ sku: 'PAY-VAR', size: 'Medium', color: 'Orange', price: 120, stock: 5, discountPercent: 0 }]
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: payProd._id.toString(), variantSku: 'PAY-VAR', quantity: 1 }],
        shippingAddress: { street: 'Pay Lane', city: 'Dallas', state: 'TX', postalCode: '75001', country: 'USA' }
      });
    payOrder = res.body.data;
  });

  it('should process payment SUCCESS simulation and advance order to PAID', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: payOrder._id,
        outcome: 'SUCCESS'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.order.status).toBe('PAID');
  });

  it('should process payment FAILED simulation, set status to PAYMENT_FAILED, and release inventory', async () => {
    // Create new order to test failure
    const failProd = await Product.create({
      name: 'Fail Item',
      slug: 'fail-item',
      description: 'Desc',
      category: 'General',
      basePrice: 50,
      sku: 'FAIL-PROD',
      stock: 5,
      variants: [{ sku: 'FAIL-VAR', size: 'Small', color: 'Black', price: 50, stock: 5, discountPercent: 0 }]
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: failProd._id.toString(), variantSku: 'FAIL-VAR', quantity: 2 }],
        shippingAddress: { street: 'Fail Lane', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' }
      });

    const failedOrderId = orderRes.body.data._id;
    // Stock is now 3
    let midCheck = await Product.findById(failProd._id);
    expect(midCheck?.stock).toBe(3);

    // Pay with outcome FAILED
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: failedOrderId,
        outcome: 'FAILED'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.payment.status).toBe('FAILED');
    expect(payRes.body.data.order.status).toBe('PAYMENT_FAILED');

    // Stock should be safely restored to 5
    const finalCheck = await Product.findById(failProd._id);
    expect(finalCheck?.stock).toBe(5);
  });

  it('should process payment TIMEOUT simulation, transition order to CANCELLED, and restore reserved inventory', async () => {
    // Create new order to test timeout
    const timeoutProd = await Product.create({
      name: 'Timeout Item',
      slug: 'timeout-item',
      description: 'Desc',
      category: 'General',
      basePrice: 60,
      sku: 'TIMEOUT-PROD',
      stock: 4,
      variants: [{ sku: 'TIMEOUT-VAR', size: 'Medium', color: 'Orange', price: 60, stock: 4, discountPercent: 0 }]
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: timeoutProd._id.toString(), variantSku: 'TIMEOUT-VAR', quantity: 2 }],
        shippingAddress: { street: 'Timeout St', city: 'Denver', state: 'CO', postalCode: '80201', country: 'USA' }
      });

    const timeoutOrderId = orderRes.body.data._id;
    // Stock is now 2
    let midCheck = await Product.findById(timeoutProd._id);
    expect(midCheck?.stock).toBe(2);

    // Pay with outcome TIMEOUT
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: timeoutOrderId,
        outcome: 'TIMEOUT'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.payment.status).toBe('TIMEOUT');
    expect(payRes.body.data.order.status).toBe('CANCELLED');

    // Stock should be safely restored to 4
    const finalCheck = await Product.findById(timeoutProd._id);
    expect(finalCheck?.stock).toBe(4);
  });

  it('should safely and idempotently handle duplicate payment webhook deliveries', async () => {
    const webhookPayload = {
      event: 'payment.success',
      transactionId: `TXN-WH-${Date.now()}`,
      orderId: payOrder._id
    };

    // Delivery 1
    const whRes1 = await request(app).post('/api/webhooks/payment').send(webhookPayload);
    expect(whRes1.status).toBe(200);
    expect(whRes1.body.success).toBe(true);

    // Delivery 2 (Duplicate replay)
    const whRes2 = await request(app).post('/api/webhooks/payment').send(webhookPayload);
    expect(whRes2.status).toBe(200);
    expect(whRes2.body.idempotent).toBe(true);
    expect(whRes2.body.message).toMatch(/already processed/i);
  });
});

describe('7. Orders API & Cancellation Suite', () => {
  let userOrder: any;

  beforeAll(async () => {
    const p = await Product.create({
      name: 'Order Lifecycle Prod',
      slug: 'order-lifecycle-prod',
      description: 'Desc',
      category: 'General',
      basePrice: 50,
      sku: 'ORD-LIFECYCLE-SKU',
      stock: 5,
      variants: [{ sku: 'ORD-LIFE-VAR', size: 'Medium', color: 'Black', price: 50, stock: 5, discountPercent: 0 }]
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: p._id.toString(), variantSku: 'ORD-LIFE-VAR', quantity: 2 }],
        shippingAddress: { street: '123 Order Rd', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'USA' }
      });
    userOrder = res.body.data;
  });

  it('should list orders for authenticated customer via GET /api/orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should get order details via GET /api/orders/:id', async () => {
    const res = await request(app)
      .get(`/api/orders/${userOrder._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBe(userOrder.orderNumber);
    expect(res.body.data.pricing).toBeDefined();
    expect(res.body.data.shippingAddress).toBeDefined();
  });

  it('should reject access to another user order by unauthorized customer', async () => {
    // Create another user
    const otherUserRes = await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: `other_${Date.now()}@zeto.com`,
      password: 'Password123!'
    });
    const otherToken = otherUserRes.body.data.token;

    const res = await request(app)
      .get(`/api/orders/${userOrder._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('should cancel order and restore stock via POST /api/orders/:id/cancel', async () => {
    const cancelProd = await Product.create({
      name: 'Direct Cancel Item',
      slug: 'direct-cancel-item',
      description: 'Desc',
      category: 'General',
      basePrice: 40,
      sku: 'CANCEL-SKU',
      stock: 4,
      variants: [{ sku: 'CANCEL-VAR', size: 'Small', color: 'Orange', price: 40, stock: 4, discountPercent: 0 }]
    });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: cancelProd._id.toString(), variantSku: 'CANCEL-VAR', quantity: 2 }],
        shippingAddress: { street: 'Cancel Way', city: 'Phoenix', state: 'AZ', postalCode: '85001', country: 'USA' }
      });

    const orderToCancel = createRes.body.data;
    const midCheck = await Product.findById(cancelProd._id);
    expect(midCheck?.stock).toBe(2);

    const cancelRes = await request(app)
      .post(`/api/orders/${orderToCancel._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const finalCheck = await Product.findById(cancelProd._id);
    expect(finalCheck?.stock).toBe(4);
  });
});

describe('8. Cart Management APIs Suite', () => {
  let cartProd: any;

  beforeAll(async () => {
    cartProd = await Product.create({
      name: 'Cart Test Product',
      slug: 'cart-test-product',
      description: 'Desc',
      category: 'Apparel',
      basePrice: 50,
      discountPercent: 10,
      sku: 'CART-TEST-SKU',
      stock: 5,
      variants: [{ sku: 'CART-VAR-1', size: 'Medium', color: 'Black', price: 50, discountPercent: 10, stock: 5 }]
    });
  });

  it('should add item to cart via POST /api/cart/items', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: cartProd._id.toString(),
        variantSku: 'CART-VAR-1',
        quantity: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('should reject adding more quantity than available stock to cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: cartProd._id.toString(),
        variantSku: 'CART-VAR-1',
        quantity: 10
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/available in stock/i);
  });

  it('should get persistent cart via GET /api/cart', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pricing).toBeDefined();
    expect(res.body.data.items[0].variantSku).toBe('CART-VAR-1');
  });

  it('should update cart item quantity via PATCH /api/cart/items/:id', async () => {
    const res = await request(app)
      .patch('/api/cart/items/CART-VAR-1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    const updated = res.body.data.items.find((i: any) => i.variantSku === 'CART-VAR-1');
    expect(updated.quantity).toBe(3);
  });

  it('should delete item from cart via DELETE /api/cart/items/:id', async () => {
    const res = await request(app)
      .delete('/api/cart/items/CART-VAR-1')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i: any) => i.variantSku === 'CART-VAR-1');
    expect(item).toBeUndefined();
  });
});

describe('9. Admin Product CRUD Suite', () => {
  let createdProductId: string;

  it('should allow admin to create a new product via POST /api/products', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Exclusive Hoodie',
        description: 'Premium fleece hoodie',
        category: 'Apparel',
        basePrice: 80,
        discountPercent: 10,
        sku: 'ADMIN-HD-01',
        stock: 10,
        variants: [
          { sku: 'ADMIN-HD-S', size: 'Small', color: 'Orange', price: 80, discountPercent: 10, stock: 5 },
          { sku: 'ADMIN-HD-M', size: 'Medium', color: 'Orange', price: 80, discountPercent: 10, stock: 5 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('ADMIN-HD-01');
    createdProductId = res.body.data._id;
  });

  it('should reject non-admin from creating a product via POST /api/products', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized Product',
        description: 'Should fail',
        category: 'Apparel',
        basePrice: 50,
        sku: 'UNAUTH-SKU'
      });

    expect(res.status).toBe(403);
  });

  it('should allow admin to update a product via PUT /api/products/:id', async () => {
    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        basePrice: 85,
        description: 'Updated description'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.basePrice).toBe(85);
  });

  it('should allow admin to delete a product via DELETE /api/products/:id', async () => {
    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    const check = await Product.findById(createdProductId);
    expect(check).toBeNull();
  });
});

describe('10. User Profile & Address Management Suite', () => {
  it('should fetch user profile via GET /api/auth/profile', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('customer_test@zeto.com');
  });

  it('should update user address via PUT /api/auth/profile', async () => {
    const newAddress = {
      street: '456 New Road',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'USA',
      isDefault: true
    };

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Updated Customer Name',
        addresses: [newAddress]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Customer Name');
    expect(res.body.data.addresses.length).toBe(1);
    expect(res.body.data.addresses[0].city).toBe('Portland');
  });
});
