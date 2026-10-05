import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { calculateOrderPricing } from '../utils/pricing';

export const getCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    let cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Format items with populated product details and calculate prices
    const formattedItems = cart.items
      .map((item: any) => {
        const product = item.productId;
        if (!product) return null;

        const variant = product.variants?.find((v: any) => v.sku === item.variantSku);
        const unitPrice = variant ? variant.price : product.basePrice;
        const discountPercent = variant ? variant.discountPercent : product.discountPercent;
        const availableStock = variant ? variant.stock : product.stock;

        return {
          productId: product._id,
          name: product.name,
          image: product.images?.[0] || '',
          variantSku: item.variantSku,
          size: variant?.size || 'Standard',
          color: variant?.color || 'Standard',
          quantity: item.quantity,
          unitPrice,
          discountPercent,
          availableStock,
          itemTotal: Math.round(unitPrice * (1 - discountPercent / 100) * item.quantity * 100) / 100
        };
      })
      .filter(Boolean);

    // Calculate totals using pricing engine
    const orderItems = formattedItems.map((item: any) => ({
      productId: item.productId.toString(),
      variantSku: item.variantSku,
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      itemTotal: item.itemTotal
    }));

    const pricing = calculateOrderPricing(orderItems);

    res.status(200).json({
      success: true,
      data: {
        cartId: cart._id,
        items: formattedItems,
        pricing
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching cart.' });
  }
};

export const addItemToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId, variantSku, quantity = 1 } = req.body;

    if (!productId || !variantSku) {
      res.status(400).json({ success: false, error: 'Product ID and variant SKU are required.' });
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    const variant = product.variants.find((v) => v.sku === variantSku);
    const availableStock = variant ? variant.stock : product.stock;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex((item) => item.variantSku === variantSku);
    const currentQty = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const newQty = currentQty + qty;

    if (newQty > availableStock) {
      res.status(400).json({
        success: false,
        error: `Only ${availableStock} units available in stock for this variant.`
      });
      return;
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = newQty;
    } else {
      cart.items.push({ productId, variantSku, quantity: qty });
    }

    await cart.save();
    await getCart(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error adding item to cart.' });
  }
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id: variantSku } = req.params;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
      res.status(400).json({ success: false, error: 'Valid positive quantity required.' });
      return;
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      res.status(404).json({ success: false, error: 'Cart not found.' });
      return;
    }

    const item = cart.items.find((i) => i.variantSku === variantSku);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not in cart.' });
      return;
    }

    // Verify stock
    const product = await Product.findById(item.productId);
    if (product) {
      const variant = product.variants.find((v) => v.sku === variantSku);
      const availableStock = variant ? variant.stock : product.stock;
      if (qty > availableStock) {
        res.status(400).json({
          success: false,
          error: `Cannot set quantity to ${qty}. Only ${availableStock} units in stock.`
        });
        return;
      }
    }

    item.quantity = qty;
    await cart.save();

    await getCart(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error updating cart item.' });
  }
};

export const removeCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id: variantSku } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      res.status(404).json({ success: false, error: 'Cart not found.' });
      return;
    }

    cart.items = cart.items.filter((i) => i.variantSku !== variantSku) as any;
    await cart.save();

    await getCart(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error removing cart item.' });
  }
};
