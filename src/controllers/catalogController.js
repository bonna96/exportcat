const prisma = require('../config/prisma');
const slugify = require('slugify');
const { indexProduct, removeFromIndex } = require('../services/searchService');
const { processImage } = require('../services/imagePipeline');

/**
 * ── Catalogue Controller ──
 * CRUD for Categories, Products, Variants, Price Brackets (FR-2)
 */

// ─── Categories ───────────────────────────────────────────────────────────────

async function listCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
        children: { where: { isActive: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (req.path.startsWith('/api/')) {
      return res.json({ categories });
    }

    return categories;
  } catch (err) {
    console.error('listCategories error:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    throw err;
  }
}

async function getCategoryBySlug(slug) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      children: { where: { isActive: true } },
      parent: true,
      _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
    },
  });
}

async function createCategory(req, res) {
  try {
    const { name, description, parentId, metaTitle, metaDesc } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const category = await prisma.category.create({
      data: { slug, name, description, parentId, metaTitle, metaDesc },
    });

    await logAudit(req, 'category.create', 'Category', category.id);
    res.status(201).json({ category });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.name) data.slug = slugify(data.name, { lower: true, strict: true });

    const category = await prisma.category.update({ where: { id }, data });
    await logAudit(req, 'category.update', 'Category', id, data);
    res.json({ category });
  } catch (err) {
    console.error('updateCategory error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

async function listProducts(req, res) {
  try {
    const { page = 1, pageSize = 20, category, status } = req.query;
    const where = {};
    if (category) where.category = { slug: category };
    if (status) where.status = status;
    else where.status = 'PUBLISHED';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          priceBrackets: { orderBy: { minQty: 'asc' }, take: 1 },
          images: { where: { isPrimary: true }, take: 1 },
          supplier: { select: { name: true, country: true } },
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const result = {
      products,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    };

    if (req.path.startsWith('/api/')) {
      return res.json(result);
    }
    return result;
  } catch (err) {
    console.error('listProducts error:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    throw err;
  }
}

async function getProductBySlug(slug) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { isActive: true } },
      priceBrackets: { orderBy: { minQty: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
      supplier: true,
      translations: true,
    },
  });
}

async function createProduct(req, res) {
  try {
    const data = req.body;
    data.slug = slugify(data.name, { lower: true, strict: true });
    data.sku = data.sku || `EC-${Date.now()}`;
    data.managerId = req.user?.id;

    // Parse arrays if sent as strings
    if (typeof data.materials === 'string') data.materials = data.materials.split(',').map((m) => m.trim());
    if (typeof data.certifications === 'string') data.certifications = data.certifications.split(',').map((c) => c.trim());

    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        sku: data.sku,
        name: data.name,
        description: data.description,
        shortDesc: data.shortDesc,
        categoryId: data.categoryId,
        managerId: data.managerId,
        moq: parseInt(data.moq) || 1,
        leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
        originCountry: data.originCountry,
        hsCode: data.hsCode,
        materials: data.materials || [],
        certifications: data.certifications || [],
        weight: data.weight ? parseFloat(data.weight) : null,
        dimensions: data.dimensions,
        metaTitle: data.metaTitle || `${data.name} — ExportCat`,
        metaDesc: data.metaDesc || (data.description || '').substring(0, 155),
        supplierId: data.supplierId,
      },
      include: { category: true, priceBrackets: true, supplier: true },
    });

    await logAudit(req, 'product.create', 'Product', product.id);
    res.status(201).json({ product });
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.name) data.slug = slugify(data.name, { lower: true, strict: true });
    if (typeof data.materials === 'string') data.materials = data.materials.split(',').map((m) => m.trim());
    if (typeof data.certifications === 'string') data.certifications = data.certifications.split(',').map((c) => c.trim());
    if (data.moq) data.moq = parseInt(data.moq);
    if (data.weight) data.weight = parseFloat(data.weight);
    if (data.leadTimeDays) data.leadTimeDays = parseInt(data.leadTimeDays);

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, priceBrackets: true, supplier: true },
    });

    // Re-index in OpenSearch
    if (product.status === 'PUBLISHED') {
      await indexProduct(product);
    }

    await logAudit(req, 'product.update', 'Product', id, data);
    res.json({ product });
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

async function publishProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { category: true, priceBrackets: true, supplier: true },
    });

    await indexProduct(product);
    await logAudit(req, 'product.publish', 'Product', id);
    res.json({ product, message: 'Product published successfully' });
  } catch (err) {
    console.error('publishProduct error:', err);
    res.status(500).json({ error: 'Failed to publish product' });
  }
}

async function unpublishProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'UNPUBLISHED' },
    });

    await removeFromIndex(id);
    await logAudit(req, 'product.unpublish', 'Product', id);
    res.json({ product, message: 'Product unpublished' });
  } catch (err) {
    console.error('unpublishProduct error:', err);
    res.status(500).json({ error: 'Failed to unpublish product' });
  }
}

async function redirectProduct(req, res) {
  try {
    const { id } = req.params;
    const { redirectSlug } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: { status: 'REDIRECTED', redirectSlug },
    });

    await removeFromIndex(id);
    await logAudit(req, 'product.redirect', 'Product', id, { redirectSlug });
    res.json({ product, message: `Product will redirect to ${redirectSlug}` });
  } catch (err) {
    console.error('redirectProduct error:', err);
    res.status(500).json({ error: 'Failed to redirect product' });
  }
}

// ─── Price Brackets ───────────────────────────────────────────────────────────

async function setPriceBrackets(req, res) {
  try {
    const { productId } = req.params;
    const { brackets } = req.body; // [{ minQty, maxQty, priceUsd, variantId? }]

    // Delete existing brackets
    await prisma.priceBracket.deleteMany({ where: { productId } });

    // Create new brackets
    const created = await prisma.priceBracket.createMany({
      data: brackets.map((b) => ({
        productId,
        minQty: b.minQty,
        maxQty: b.maxQty || null,
        priceUsd: b.priceUsd,
        variantId: b.variantId || null,
      })),
    });

    await logAudit(req, 'product.pricing', 'Product', productId, { brackets });
    res.json({ count: created.count, message: 'Price brackets updated' });
  } catch (err) {
    console.error('setPriceBrackets error:', err);
    res.status(500).json({ error: 'Failed to update price brackets' });
  }
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

async function uploadProductImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const { productId } = req.params;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Process image through Sharp pipeline
    const result = await processImage(req.file.path, product.slug);

    // Check if this is the first image (make primary)
    const existingImages = await prisma.productImage.count({ where: { productId } });

    const image = await prisma.productImage.create({
      data: {
        productId,
        originalUrl: result.original,
        webpUrl: result.webpUrl,
        avifUrl: result.avifUrl,
        width: result.width,
        height: result.height,
        altText: req.body.altText || product.name,
        isPrimary: existingImages === 0,
        sortOrder: existingImages,
      },
    });

    await logAudit(req, 'product.image.upload', 'Product', productId);
    res.status(201).json({ image, srcset: result });
  } catch (err) {
    console.error('uploadProductImage error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

// ─── Variants ─────────────────────────────────────────────────────────────────

async function createVariant(req, res) {
  try {
    const { productId } = req.params;
    const { name, attributes, sku, stock } = req.body;

    const variant = await prisma.variant.create({
      data: {
        productId,
        sku: sku || `${productId}-${Date.now()}`,
        name,
        attributes: attributes || {},
        stock: stock || 0,
      },
    });

    await logAudit(req, 'variant.create', 'Variant', variant.id);
    res.status(201).json({ variant });
  } catch (err) {
    console.error('createVariant error:', err);
    res.status(500).json({ error: 'Failed to create variant' });
  }
}

// ─── Audit Logging Helper ─────────────────────────────────────────────────────

async function logAudit(req, action, entityType, entityId, changes = null) {
  try {
    if (!req.user) return;
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action,
        entityType,
        entityId,
        changes,
        ipAddress: req.ip,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  publishProduct,
  unpublishProduct,
  redirectProduct,
  setPriceBrackets,
  uploadProductImage,
  createVariant,
};
