import { Request, Response } from 'express';
import { Product } from '../models/Product';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, minPrice, maxPrice, sort, lowStockOnly } = req.query;

    const query: any = {};

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { sku: searchRegex },
        { 'variants.sku': searchRegex }
      ];
    }

    if (category && typeof category === 'string' && category !== 'All') {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { basePrice: 1 };
    else if (sort === 'price_desc') sortOption = { basePrice: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };

    const products = await Product.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching products.' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching product.' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      description,
      category,
      images,
      basePrice,
      discountPercent,
      sku,
      variants,
      lowStockThreshold
    } = req.body;

    if (!name || !description || !category || basePrice === undefined || !sku) {
      res.status(400).json({ success: false, error: 'Required product fields missing.' });
      return;
    }

    // Auto calculate overall stock from variants if variants exist
    let totalStock = 0;
    if (Array.isArray(variants) && variants.length > 0) {
      totalStock = variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
    } else {
      totalStock = Number(req.body.stock) || 0;
    }

    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const product = await Product.create({
      name,
      slug: autoSlug,
      description,
      category,
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop'],
      basePrice: Number(basePrice),
      discountPercent: Number(discountPercent) || 0,
      sku,
      stock: totalStock,
      variants: variants || [],
      lowStockThreshold: Number(lowStockThreshold) || 5
    });

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error creating product.' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (Array.isArray(updates.variants)) {
      updates.stock = updates.variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error updating product.' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error deleting product.' });
  }
};
