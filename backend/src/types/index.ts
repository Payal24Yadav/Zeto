export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariant {
  sku: string;
  size: 'Small' | 'Medium' | 'Large' | 'XL';
  color: string;
  price: number;
  discountPercent: number;
  stock: number;
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  images: string[];
  basePrice: number;
  discountPercent: number;
  sku: string;
  stock: number;
  variants: IVariant[];
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  productId: any;
  variantSku: string;
  quantity: number;
}

export interface ICart {
  _id: any;
  userId: any;
  items: ICartItem[];
  updatedAt: Date;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface IOrderItem {
  productId: any;
  variantSku: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  itemTotal: number;
}

export interface IOrderPricing {
  subtotal: number;
  discountTotal: number;
  tax: number;
  shipping: number;
  finalTotal: number;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder {
  _id: any;
  orderNumber: string;
  userId: any;
  items: IOrderItem[];
  pricing: IOrderPricing;
  shippingAddress: IAddress;
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  reservationExpiresAt: Date;
  idempotencyKey?: string;
  paymentId?: any;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface IPayment {
  _id: any;
  orderId: any;
  transactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey?: string;
  webhookDelivered: boolean;
  webhookDeliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
