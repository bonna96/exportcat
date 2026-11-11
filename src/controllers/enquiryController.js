const prisma = require('../config/prisma');
const { sendEnquiryNotification } = require('../services/emailService');

/**
 * ── Enquiry Controller ──
 * Buyer RFQ submissions and management (FR-13)
 */

async function submitEnquiry(req, res) {
  try {
    const {
      productId,
      buyerName,
      buyerEmail,
      buyerCompany,
      buyerCountry,
      quantity,
      message,
    } = req.body;

    // Validate product exists and is published
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        manager: { select: { email: true, name: true } },
        supplier: { select: { contactEmail: true } },
      },
    });

    if (!product || product.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    // Create enquiry record
    const enquiry = await prisma.quoteEnquiry.create({
      data: {
        productId,
        buyerId: req.user?.id || null,
        buyerName,
        buyerEmail,
        buyerCompany,
        buyerCountry,
        quantity: parseInt(quantity),
        message,
      },
    });

    // Send email notification to Manager
    const managerEmail = product.manager?.email || product.supplier?.contactEmail;
    if (managerEmail) {
      await sendEnquiryNotification(enquiry, product, managerEmail);
    }

    res.status(201).json({
      enquiry,
      message: 'Your enquiry has been submitted. The supplier will contact you shortly.',
    });
  } catch (err) {
    console.error('submitEnquiry error:', err);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
}

async function listEnquiries(req, res) {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const where = {};

    // Managers see enquiries for their products; Admins see all
    if (req.user.role === 'MANAGER') {
      where.product = { managerId: req.user.id };
    }
    if (status) where.status = status;

    const [enquiries, total] = await Promise.all([
      prisma.quoteEnquiry.findMany({
        where,
        include: {
          product: { select: { name: true, slug: true, sku: true } },
          buyer: { select: { name: true, email: true } },
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quoteEnquiry.count({ where }),
    ]);

    res.json({
      enquiries,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  } catch (err) {
    console.error('listEnquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
}

async function updateEnquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const enquiry = await prisma.quoteEnquiry.update({
      where: { id },
      data: {
        status,
        respondedAt: status === 'RESPONDED' ? new Date() : undefined,
      },
    });

    res.json({ enquiry });
  } catch (err) {
    console.error('updateEnquiryStatus error:', err);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
}

module.exports = { submitEnquiry, listEnquiries, updateEnquiryStatus };
