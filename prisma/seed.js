const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

// ─── Seed Data ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ExportCat database...\n');

  // ── 1. Users (4 roles) ──────────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@exportcat.com' },
      update: {},
      create: {
        email: 'admin@exportcat.com',
        name: 'Site Administrator',
        role: 'ADMIN',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@exportcat.com' },
      update: {},
      create: {
        email: 'manager@exportcat.com',
        name: 'Catalogue Manager',
        role: 'MANAGER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'analyst@exportcat.com' },
      update: {},
      create: {
        email: 'analyst@exportcat.com',
        name: 'SEO Analyst',
        role: 'ANALYST',
      },
    }),
    prisma.user.upsert({
      where: { email: 'buyer@exportcat.com' },
      update: {},
      create: {
        email: 'buyer@exportcat.com',
        name: 'Test Buyer',
        role: 'BUYER',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} demo users`);

  // ── 2. Categories ──────────────────────────────────────────────────────────
  const categories = [];

  const categoryData = [
    { name: 'Jute & Natural Fibers', description: 'Raw and processed jute, hessian, and natural fiber products' },
    { name: 'Textiles & Fabrics', description: 'Woven, knitted, and nonwoven textile products for export' },
    { name: 'Leather Goods', description: 'Finished leather and leather products for international markets' },
    { name: 'Ceramic & Pottery', description: 'Handcrafted and industrial ceramic products' },
    { name: 'Agricultural Products', description: 'Processed and raw agricultural commodities' },
    { name: 'Garments & Apparel', description: 'Ready-made garments for wholesale export' },
    { name: 'Handicrafts', description: 'Traditional and modern handmade products' },
    { name: 'Packaging Materials', description: 'Industrial and consumer packaging solutions' },
    { name: 'Chemicals & Dyes', description: 'Industrial chemicals and textile dyes' },
    { name: 'Frozen Foods', description: 'Frozen seafood and processed food products' },
  ];

  for (const cat of categoryData) {
    const slug = slugify(cat.name, { lower: true, strict: true });
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: cat.name,
        description: cat.description,
        metaTitle: `${cat.name} — Wholesale Export Catalogue | ExportCat`,
        metaDesc: `Browse wholesale ${cat.name.toLowerCase()} from verified suppliers. MOQ pricing, certifications, and specs.`,
      },
    });
    categories.push(category);
  }

  console.log(`✅ Created ${categories.length} categories`);

  // ── 3. Suppliers ──────────────────────────────────────────────────────────
  const suppliers = [];
  const supplierData = [
    { name: 'Bengal Jute Mills Ltd.', country: 'Bangladesh', contactEmail: 'sales@bengaljute.com', certifications: ['ISO 9001', 'OEKO-TEX Standard 100'] },
    { name: 'Dhaka Textiles Corp.', country: 'Bangladesh', contactEmail: 'export@dhakatextiles.com', certifications: ['ISO 14001', 'GOTS'] },
    { name: 'Chittagong Leather Works', country: 'Bangladesh', contactEmail: 'info@ctgleather.com', certifications: ['LWG Gold'] },
    { name: 'Rajshahi Ceramics', country: 'Bangladesh', contactEmail: 'orders@rajceramics.com', certifications: ['ISO 9001'] },
    { name: 'Sylhet Agro Exports', country: 'Bangladesh', contactEmail: 'export@sylhetagro.com', certifications: ['HACCP', 'ISO 22000'] },
  ];

  for (const s of supplierData) {
    const supplier = await prisma.supplier.create({
      data: {
        name: s.name,
        country: s.country,
        contactEmail: s.contactEmail,
        certifications: s.certifications,
        isVerified: true,
      },
    });
    suppliers.push(supplier);
  }

  console.log(`✅ Created ${suppliers.length} suppliers`);

  // ── 4. Products (50+ B2B export products) ─────────────────────────────────
  const manager = users[1]; // Catalogue Manager
  const productData = [
    // Jute & Natural Fibers (10 products)
    { catIdx: 0, supIdx: 0, name: 'Raw Jute Fiber CB Grade', desc: 'Premium quality raw jute fiber, CB grade, suitable for spinning mills. Harvested from the Bengal delta region. Clean, well-retted fibers with consistent staple length.', moq: 5000, weight: 50, materials: ['Raw Jute'], certs: ['ISO 9001'], price: 850, origin: 'Bangladesh', hs: '5303.10' },
    { catIdx: 0, supIdx: 0, name: 'Hessian Cloth 350 GSM', desc: 'Heavy-duty hessian cloth at 350 GSM weight, ideal for industrial packaging, upholstery backing, and geotextile applications. Available in rolls of 100m.', moq: 500, weight: 35, materials: ['Jute', 'Hessian'], certs: ['ISO 9001', 'OEKO-TEX Standard 100'], price: 1.25, origin: 'Bangladesh', hs: '5310.10' },
    { catIdx: 0, supIdx: 0, name: 'Jute Shopping Bag — Laminated', desc: 'Eco-friendly laminated jute shopping bags with reinforced handles. Custom printing available. Reusable alternative to plastic bags for retail and promotional use.', moq: 1000, weight: 0.25, materials: ['Jute', 'Polypropylene Lamination'], certs: ['OEKO-TEX Standard 100'], price: 1.85, origin: 'Bangladesh', hs: '4202.92' },
    { catIdx: 0, supIdx: 0, name: 'Jute Yarn CRX Quality', desc: 'High-quality jute yarn in CRX grade for weaving and handicraft applications. Available in counts from 6 lb to 14 lb.', moq: 2000, weight: 181.4, materials: ['Jute Fiber'], certs: ['ISO 9001'], price: 720, origin: 'Bangladesh', hs: '5307.10' },
    { catIdx: 0, supIdx: 0, name: 'Coir Fiber Mattress Pad', desc: 'Natural coconut coir fiber mattress pad, compressed and rubberised. Available in single, double, and king sizes. Hypoallergenic and breathable.', moq: 200, weight: 8, materials: ['Coconut Coir', 'Natural Latex'], certs: ['ISO 9001', 'OEKO-TEX Standard 100'], price: 22.50, origin: 'Bangladesh', hs: '5305.00' },
    { catIdx: 0, supIdx: 0, name: 'Sisal Rope 10mm', desc: 'Natural sisal rope, 10mm diameter, available in 200m coils. Ideal for marine, agricultural, and decorative applications. High tensile strength.', moq: 500, weight: 12, materials: ['Sisal Fiber'], certs: ['ISO 9001'], price: 0.45, origin: 'Bangladesh', hs: '5607.29' },
    { catIdx: 0, supIdx: 0, name: 'Jute Geotextile Fabric', desc: 'Biodegradable jute geotextile for soil erosion control and slope stabilization. Weight: 500–900 GSM. Used in road construction and landscaping projects.', moq: 1000, weight: 70, materials: ['Jute'], certs: ['ISO 9001', 'ISO 14001'], price: 2.10, origin: 'Bangladesh', hs: '5911.90' },
    { catIdx: 0, supIdx: 0, name: 'Jute Carpet Backing Cloth', desc: 'High-quality jute carpet backing cloth (CBC) in standard widths. Used as secondary backing for tufted carpets. Consistent weave quality.', moq: 2000, weight: 40, materials: ['Jute'], certs: ['OEKO-TEX Standard 100'], price: 0.95, origin: 'Bangladesh', hs: '5310.90' },
    { catIdx: 0, supIdx: 0, name: 'Natural Jute Twine', desc: 'Biodegradable natural jute twine for gardening, crafts, and packaging. Available in 2-ply and 3-ply variants. Rolls of 200m and 500m.', moq: 5000, weight: 0.5, materials: ['Jute'], certs: ['ISO 9001'], price: 0.30, origin: 'Bangladesh', hs: '5607.21' },
    { catIdx: 0, supIdx: 0, name: 'Kenaf Fiber Bale', desc: 'Mechanically extracted kenaf (Hibiscus cannabinus) fiber bales for paper pulp, composite materials, and insulation. Sustainable alternative to wood pulp.', moq: 1000, weight: 200, materials: ['Kenaf Fiber'], certs: ['ISO 14001'], price: 380, origin: 'Bangladesh', hs: '5303.90' },

    // Textiles & Fabrics (8 products)
    { catIdx: 1, supIdx: 1, name: 'Cotton Poplin Fabric 60s', desc: 'Premium 60s count cotton poplin fabric for shirting. Available in bleached white, dyed, and printed varieties. Width: 58/60 inches.', moq: 3000, weight: 0.12, materials: ['100% Cotton'], certs: ['GOTS', 'OEKO-TEX Standard 100'], price: 2.80, origin: 'Bangladesh', hs: '5208.21' },
    { catIdx: 1, supIdx: 1, name: 'Denim Fabric 12oz Indigo', desc: 'Heavy 12oz indigo-dyed denim fabric for jeans and workwear. Ring-spun warp, open-end weft. Selvedge and non-selvedge options available.', moq: 2000, weight: 0.34, materials: ['Cotton', 'Elastane'], certs: ['GOTS'], price: 4.50, origin: 'Bangladesh', hs: '5209.42' },
    { catIdx: 1, supIdx: 1, name: 'Muslin Fabric — Heritage Weave', desc: 'Ultra-fine muslin fabric woven using traditional Dhaka techniques. Thread count: 300+. Luxurious hand-feel for premium garments and home textiles.', moq: 100, weight: 0.06, materials: ['100% Cotton (Phuti Karpas)'], certs: ['Handloom Mark'], price: 35.00, origin: 'Bangladesh', hs: '5208.11' },
    { catIdx: 1, supIdx: 1, name: 'Terry Towel — 500 GSM', desc: 'Premium terry cloth towels at 500 GSM. Ring-spun cotton, double-stitched hems. Available in bath, hand, and face sizes. White and dyed.', moq: 5000, weight: 0.6, materials: ['100% Combed Cotton'], certs: ['OEKO-TEX Standard 100'], price: 3.20, origin: 'Bangladesh', hs: '6302.60' },
    { catIdx: 1, supIdx: 1, name: 'Knit Jersey Fabric 180 GSM', desc: 'Single jersey knit fabric, 180 GSM, suitable for t-shirts and casual wear. Tubular and open-width options. Bio-washed finish available.', moq: 3000, weight: 0.18, materials: ['Cotton', 'Polyester'], certs: ['GOTS', 'OEKO-TEX Standard 100'], price: 3.10, origin: 'Bangladesh', hs: '6006.22' },
    { catIdx: 1, supIdx: 1, name: 'Nonwoven Polypropylene 70 GSM', desc: 'Spunbond nonwoven polypropylene fabric at 70 GSM. Used for shopping bags, medical disposables, and agriculture. UV-treated options available.', moq: 10000, weight: 0.07, materials: ['Polypropylene'], certs: ['ISO 9001'], price: 0.55, origin: 'Bangladesh', hs: '5603.11' },
    { catIdx: 1, supIdx: 1, name: 'Silk Jamdani Saree — Handloom', desc: 'Traditional handloom Jamdani saree with intricate geometric motifs woven in fine muslin. UNESCO-recognized intangible heritage craft.', moq: 10, weight: 0.35, materials: ['Silk', 'Cotton'], certs: ['Handloom Mark', 'GI Tag'], price: 120.00, origin: 'Bangladesh', hs: '5007.20' },
    { catIdx: 1, supIdx: 1, name: 'Bed Linen Set — 400TC', desc: '400 thread count sateen bed linen set: fitted sheet, flat sheet, and 2 pillowcases. Egyptian-style cotton, mercerised finish.', moq: 500, weight: 2.2, materials: ['100% Long-Staple Cotton'], certs: ['OEKO-TEX Standard 100'], price: 28.50, origin: 'Bangladesh', hs: '6302.31' },

    // Leather Goods (6 products)
    { catIdx: 2, supIdx: 2, name: 'Full Grain Cow Leather — Vegetable Tanned', desc: 'Premium full-grain cowhide leather, vegetable-tanned using traditional pit-tanning methods. Thickness: 1.2–1.4mm. For luxury bags, shoes, and accessories.', moq: 500, weight: 0.8, materials: ['Full Grain Cowhide'], certs: ['LWG Gold'], price: 18.50, origin: 'Bangladesh', hs: '4107.12' },
    { catIdx: 2, supIdx: 2, name: 'Leather Work Gloves — Industrial', desc: 'Split leather industrial work gloves with cotton lining. Reinforced palm and thumb. CE EN 388 certified for mechanical risks.', moq: 5000, weight: 0.15, materials: ['Split Cowhide', 'Cotton'], certs: ['CE EN 388', 'ISO 9001'], price: 2.80, origin: 'Bangladesh', hs: '4203.29' },
    { catIdx: 2, supIdx: 2, name: 'Leather Laptop Bag — 15 inch', desc: 'Handcrafted vegetable-tanned leather laptop bag, fits up to 15.6" laptops. Padded compartment, brass hardware, adjustable shoulder strap.', moq: 100, weight: 1.2, materials: ['Full Grain Leather', 'Brass'], certs: ['LWG Gold'], price: 45.00, origin: 'Bangladesh', hs: '4202.11' },
    { catIdx: 2, supIdx: 2, name: 'Goat Leather Shoe Upper', desc: 'Pre-cut goat leather shoe uppers for the footwear industry. Chrome-tanned, semi-aniline finish. Consistent colour matching across batches.', moq: 2000, weight: 0.3, materials: ['Goat Leather'], certs: ['LWG Gold', 'ISO 9001'], price: 8.50, origin: 'Bangladesh', hs: '4107.92' },
    { catIdx: 2, supIdx: 2, name: 'Leather Belt — Wholesale', desc: 'Men\'s leather belt, 35mm width, available in black and brown. Nickel-free buckle option for EU markets. Custom logo debossing available.', moq: 1000, weight: 0.2, materials: ['Genuine Leather', 'Zinc Alloy Buckle'], certs: ['REACH Compliant'], price: 4.50, origin: 'Bangladesh', hs: '4203.30' },
    { catIdx: 2, supIdx: 2, name: 'Suede Leather — Pigment Finish', desc: 'Split suede leather with pigment-printed finish. Thickness: 0.8–1.0mm. Ideal for footwear linings, garments, and small accessories.', moq: 1000, weight: 0.5, materials: ['Split Suede Cowhide'], certs: ['LWG Gold'], price: 9.20, origin: 'Bangladesh', hs: '4107.19' },

    // Ceramic & Pottery (5 products)
    { catIdx: 3, supIdx: 3, name: 'Stoneware Dinner Set — 16 Piece', desc: '16-piece stoneware dinner set: 4 dinner plates, 4 side plates, 4 bowls, 4 mugs. Microwave and dishwasher safe. Reactive glaze finish.', moq: 200, weight: 8.5, materials: ['Stoneware Clay'], certs: ['FDA Compliant', 'Lead-Free'], price: 18.00, origin: 'Bangladesh', hs: '6912.00' },
    { catIdx: 3, supIdx: 3, name: 'Terracotta Planter — Large', desc: 'Handmade terracotta planter, 40cm diameter. Traditional Bengali patterns. Drainage hole included. Suitable for indoor and outdoor use.', moq: 500, weight: 4.5, materials: ['Terracotta Clay'], certs: ['Handcraft Certificate'], price: 6.50, origin: 'Bangladesh', hs: '6914.90' },
    { catIdx: 3, supIdx: 3, name: 'Porcelain Tea Set — 12 Piece', desc: 'Fine bone china tea set with gold trim. Set includes teapot, sugar bowl, cream jug, 4 cups, and 4 saucers. Gift-boxed.', moq: 100, weight: 3.2, materials: ['Bone China'], certs: ['FDA Compliant', 'Lead-Free'], price: 32.00, origin: 'Bangladesh', hs: '6911.10' },
    { catIdx: 3, supIdx: 3, name: 'Ceramic Floor Tile 600x600mm', desc: 'Glazed ceramic floor tile, 600x600mm, 10mm thickness. Wood-grain pattern, matte finish. Water absorption < 3%. Class 4 abrasion resistance.', moq: 1000, weight: 18, materials: ['Ceramic'], certs: ['ISO 13006', 'CE Marked'], price: 5.80, origin: 'Bangladesh', hs: '6908.90' },
    { catIdx: 3, supIdx: 3, name: 'Decorative Ceramic Vase', desc: 'Hand-painted decorative ceramic vase, height 30cm. Blue and white traditional motifs. Each piece is unique due to handmade production.', moq: 200, weight: 1.8, materials: ['Stoneware Clay'], certs: ['Handcraft Certificate'], price: 12.50, origin: 'Bangladesh', hs: '6913.90' },

    // Agricultural Products (5 products)
    { catIdx: 4, supIdx: 4, name: 'Basmati Rice — Premium Long Grain', desc: 'Premium long-grain basmati rice, aged 12 months. Grain length: 8mm+. Aroma-rich, ideal for biryani and pilaf. Available in 25kg and 50kg bags.', moq: 5000, weight: 50, materials: ['Basmati Rice'], certs: ['HACCP', 'ISO 22000'], price: 42.00, origin: 'Bangladesh', hs: '1006.30' },
    { catIdx: 4, supIdx: 4, name: 'Frozen Black Tiger Shrimp', desc: 'IQF frozen black tiger shrimp (Penaeus monodon). Head-on/shell-on and PD variants. Size range: 16/20 to 31/40 count per pound.', moq: 1000, weight: 2, materials: ['Black Tiger Shrimp'], certs: ['HACCP', 'BAP', 'EU Approved'], price: 12.80, origin: 'Bangladesh', hs: '0306.17' },
    { catIdx: 4, supIdx: 4, name: 'Golden Fiber Mustard Oil', desc: 'Cold-pressed virgin mustard oil from premium yellow mustard seeds. High erucic acid content for authentic flavour. Available in 1L, 5L, and 200L drums.', moq: 2000, weight: 0.92, materials: ['Yellow Mustard Seeds'], certs: ['FSSAI', 'ISO 22000'], price: 3.50, origin: 'Bangladesh', hs: '1514.11' },
    { catIdx: 4, supIdx: 4, name: 'Dried Turmeric Finger — Whole', desc: 'Sun-dried whole turmeric fingers (Curcuma longa). Curcumin content: 3–5%. Deep orange colour. Available in 25kg and 50kg gunny bags.', moq: 5000, weight: 25, materials: ['Turmeric Rhizome'], certs: ['HACCP', 'Organic (USDA)'], price: 28.00, origin: 'Bangladesh', hs: '0910.11' },
    { catIdx: 4, supIdx: 4, name: 'Green Mung Beans — Export Quality', desc: 'Cleaned and graded green mung beans (Vigna radiata). Moisture content < 12%. Packing in 25kg and 50kg polypropylene bags.', moq: 10000, weight: 50, materials: ['Mung Beans'], certs: ['ISO 22000', 'Phytosanitary Certificate'], price: 35.00, origin: 'Bangladesh', hs: '0713.31' },

    // Garments & Apparel (6 products)
    { catIdx: 5, supIdx: 1, name: 'Men\'s Basic T-Shirt 180 GSM', desc: 'Ring-spun cotton crew neck t-shirt, 180 GSM. Pre-shrunk, garment-dyed. Available in 15+ colours, sizes S-3XL. Ideal for private label.', moq: 3000, weight: 0.2, materials: ['100% Ring-Spun Cotton'], certs: ['GOTS', 'OEKO-TEX Standard 100'], price: 2.80, origin: 'Bangladesh', hs: '6109.10' },
    { catIdx: 5, supIdx: 1, name: 'Women\'s Denim Jeans — Slim Fit', desc: 'Women\'s slim-fit stretch denim jeans, 11oz fabric with 2% elastane. Five-pocket styling. Sizes 24–34. Enzyme wash finish.', moq: 1000, weight: 0.65, materials: ['Cotton', 'Elastane'], certs: ['OEKO-TEX Standard 100'], price: 8.50, origin: 'Bangladesh', hs: '6204.62' },
    { catIdx: 5, supIdx: 1, name: 'Polo Shirt — Piqué Cotton', desc: 'Classic piqué cotton polo shirt with ribbed collar and 3-button placket. Suitable for corporate uniforms and retail. Embroidery ready.', moq: 2000, weight: 0.25, materials: ['100% Cotton Piqué'], certs: ['OEKO-TEX Standard 100'], price: 4.20, origin: 'Bangladesh', hs: '6105.10' },
    { catIdx: 5, supIdx: 1, name: 'Workwear Cargo Pants', desc: 'Heavy-duty 300 GSM cotton drill cargo pants with reinforced knees and multiple pockets. Industrial wash for durability. Hi-vis strip option.', moq: 1000, weight: 0.85, materials: ['100% Cotton Drill'], certs: ['EN ISO 13688', 'OEKO-TEX Standard 100'], price: 9.80, origin: 'Bangladesh', hs: '6203.42' },
    { catIdx: 5, supIdx: 1, name: 'Children\'s Knit Bodysuit', desc: 'Infant knit bodysuit (0–24 months) in 100% organic cotton. Snap button closure, flat-lock seams. GOTS certified. Pack of 3.', moq: 5000, weight: 0.08, materials: ['100% Organic Cotton'], certs: ['GOTS', 'OEKO-TEX Standard 100'], price: 3.60, origin: 'Bangladesh', hs: '6111.20' },
    { catIdx: 5, supIdx: 1, name: 'Hi-Vis Safety Vest — Class 2', desc: 'High-visibility safety vest meeting EN ISO 20471 Class 2. Fluorescent yellow with retroreflective strips. Zipper closure. One size fits most.', moq: 5000, weight: 0.15, materials: ['Polyester', 'Retroreflective Tape'], certs: ['EN ISO 20471', 'CE Marked'], price: 2.20, origin: 'Bangladesh', hs: '6211.33' },

    // Handicrafts (4 products)
    { catIdx: 6, supIdx: 3, name: 'Nakshi Kantha — Hand-Embroidered Quilt', desc: 'Traditional Bengali Nakshi Kantha quilt with intricate hand-embroidery on recycled cotton layers. Each piece takes 2–3 months to make. GI-tagged.', moq: 20, weight: 1.5, materials: ['Recycled Cotton', 'Hand Embroidery Thread'], certs: ['GI Tag', 'Handcraft Certificate'], price: 65.00, origin: 'Bangladesh', hs: '5811.00' },
    { catIdx: 6, supIdx: 3, name: 'Bamboo Basket Set — 3 Piece', desc: 'Hand-woven bamboo basket set (small, medium, large). Traditional Bangladeshi weaving patterns. Natural lacquer finish for durability.', moq: 200, weight: 2.5, materials: ['Bamboo', 'Natural Lacquer'], certs: ['Handcraft Certificate'], price: 8.50, origin: 'Bangladesh', hs: '4602.19' },
    { catIdx: 6, supIdx: 3, name: 'Brass Decorative Plate — Dhokra Art', desc: 'Lost-wax casting (Dhokra) decorative brass plate, 25cm diameter. Ancient metalworking technique featuring tribal motifs. Wall-mountable.', moq: 50, weight: 0.8, materials: ['Brass', 'Copper'], certs: ['Handcraft Certificate'], price: 22.00, origin: 'Bangladesh', hs: '7419.99' },
    { catIdx: 6, supIdx: 3, name: 'Shital Pati Mat — Fine Weave', desc: 'Hand-woven Shital Pati (cool mat) from Sylhet. UNESCO-listed intangible heritage. Made from murta reed. Natural cooling properties.', moq: 100, weight: 2.0, materials: ['Murta Reed'], certs: ['GI Tag', 'UNESCO ICH'], price: 28.00, origin: 'Bangladesh', hs: '4601.29' },

    // Packaging Materials (3 products)
    { catIdx: 7, supIdx: 0, name: 'Corrugated Carton Box — 5-Ply', desc: '5-ply corrugated carton box for heavy-duty export packaging. Custom sizes, printing, and die-cutting available. Burst strength: 12+ kg/cm².', moq: 5000, weight: 0.65, materials: ['Kraft Liner', 'Fluting Medium'], certs: ['ISO 9001'], price: 0.85, origin: 'Bangladesh', hs: '4819.10' },
    { catIdx: 7, supIdx: 0, name: 'Jute Sack — Standard 44x26', desc: 'Standard jute sack (44x26 inches) for grain, sugar, coffee, and commodity storage. A-Twill weave, 620+ GSM. Compliant with international commodity standards.', moq: 10000, weight: 0.9, materials: ['Jute'], certs: ['ISO 9001', 'ICC Compliant'], price: 1.10, origin: 'Bangladesh', hs: '6305.10' },
    { catIdx: 7, supIdx: 0, name: 'Shrink Wrap Film — PVC 19 Micron', desc: 'PVC heat shrink wrap film, 19 micron thickness. Clear, high-gloss finish. Available in rolls of 450mm and 600mm width. Centre-fold option.', moq: 5000, weight: 3.5, materials: ['PVC'], certs: ['REACH Compliant', 'RoHS'], price: 2.30, origin: 'Bangladesh', hs: '3920.43' },

    // Chemicals & Dyes (2 products)
    { catIdx: 8, supIdx: 4, name: 'Reactive Dye — Turquoise Blue', desc: 'Vinyl sulphone reactive dye for cellulosic fibers. High colour fastness (wash fastness: 4–5). Shade: Turquoise Blue. 25kg fibre drums.', moq: 500, weight: 25, materials: ['Reactive Dye Chemical'], certs: ['REACH Compliant', 'OEKO-TEX Standard 100'], price: 12.50, origin: 'Bangladesh', hs: '3204.16' },
    { catIdx: 8, supIdx: 4, name: 'Sodium Carbonate — Soda Ash Light', desc: 'Soda ash light (Na₂CO₃) for textile dyeing, glass manufacturing, and water treatment. Purity: 99.2% min. 50kg PP bags, palletised.', moq: 10000, weight: 50, materials: ['Sodium Carbonate'], certs: ['ISO 9001'], price: 185.00, origin: 'Bangladesh', hs: '2836.20' },

    // Frozen Foods (1 product)
    { catIdx: 9, supIdx: 4, name: 'Frozen Hilsa Fish — Whole', desc: 'Frozen whole Hilsa fish (Tenualosa ilisha), individually quick-frozen. Grade A quality, weight: 800g–1.2kg per fish. Blast-frozen at -40°C.', moq: 1000, weight: 1, materials: ['Hilsa Fish'], certs: ['HACCP', 'EU Approved', 'FDA Registered'], price: 8.50, origin: 'Bangladesh', hs: '0303.89' },
  ];

  let productCount = 0;
  for (const p of productData) {
    const slug = slugify(p.name, { lower: true, strict: true });
    const sku = `EC-${String(productCount + 1).padStart(4, '0')}`;

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        sku,
        name: p.name,
        description: p.desc,
        shortDesc: p.desc.substring(0, 160),
        categoryId: categories[p.catIdx].id,
        managerId: manager.id,
        supplierId: suppliers[p.supIdx].id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        moq: p.moq,
        weight: p.weight,
        originCountry: p.origin,
        hsCode: p.hs,
        materials: p.materials,
        certifications: p.certs,
        metaTitle: `${p.name} — Wholesale Export | ExportCat`,
        metaDesc: p.desc.substring(0, 155) + '...',
      },
    });

    // Create default price brackets
    await prisma.priceBracket.createMany({
      data: [
        { productId: product.id, minQty: p.moq, maxQty: p.moq * 2, priceUsd: p.price },
        { productId: product.id, minQty: p.moq * 2 + 1, maxQty: p.moq * 5, priceUsd: +(p.price * 0.92).toFixed(2) },
        { productId: product.id, minQty: p.moq * 5 + 1, maxQty: null, priceUsd: +(p.price * 0.85).toFixed(2) },
      ],
    });

    productCount++;
  }

  console.log(`✅ Created ${productCount} products with price brackets`);

  // ── 5. Synonym Rules ─────────────────────────────────────────────────────
  const synonymData = [
    { synonyms: ['jute', 'hessian', 'burlap'] },
    { synonyms: ['fabric', 'cloth', 'textile'] },
    { synonyms: ['bag', 'sack', 'pouch'] },
    { synonyms: ['organic', 'natural', 'eco-friendly'] },
    { synonyms: ['leather', 'hide', 'skin'] },
    { synonyms: ['frozen', 'iqf', 'blast-frozen'] },
    { synonyms: ['ceramic', 'pottery', 'stoneware'] },
    { synonyms: ['dye', 'colorant', 'pigment'] },
    { synonyms: ['garment', 'apparel', 'clothing'] },
    { synonyms: ['rope', 'twine', 'cord'] },
  ];

  for (const s of synonymData) {
    await prisma.synonymRule.create({
      data: { synonyms: s.synonyms, locale: 'en-gb', isActive: true },
    });
  }

  console.log(`✅ Created ${synonymData.length} synonym rules`);

  // ── 6. Facet Rules ────────────────────────────────────────────────────────
  const facetKeys = ['material', 'certification', 'origin_country', 'price_range'];
  for (const category of categories) {
    for (const key of facetKeys) {
      await prisma.facetRule.create({
        data: {
          categoryId: category.id,
          facetKey: key,
          maxCombinations: key === 'price_range' ? 1 : 2,
          action: key === 'material' ? 'INDEX' : 'CANONICAL_TO_PARENT',
          isActive: true,
        },
      });
    }
  }

  console.log(`✅ Created ${categories.length * facetKeys.length} facet rules`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📧 Demo Accounts:');
  console.log('   admin@exportcat.com    (Site Administrator)');
  console.log('   manager@exportcat.com  (Catalogue Manager)');
  console.log('   analyst@exportcat.com  (Search & SEO Analyst)');
  console.log('   buyer@exportcat.com    (Buyer)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
