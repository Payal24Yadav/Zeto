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
  id: string;
  name: string;
  email: string;
  role: UserRole;
  addresses: IAddress[];
}

export interface IVariant {
  sku: string;
  size: string;
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
}

export interface ICartItem {
  productId: string;
  name: string;
  image: string;
  variantSku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  availableStock: number;
  itemTotal: number;
}

export interface IOrderPricing {
  subtotal: number;
  discountTotal: number;
  tax: number;
  shipping: number;
  finalTotal: number;
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
  productId: string;
  variantSku: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  itemTotal: number;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  userId: any;
  items: IOrderItem[];
  pricing: IOrderPricing;
  shippingAddress: IAddress;
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  reservationExpiresAt: string;
  idempotencyKey?: string;
  createdAt: string;
}
