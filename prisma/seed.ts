import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    slug: "classic-logo-tee",
    title: "Classic Logo Tee",
    description:
      "A comfortable cotton t-shirt featuring our signature logo. Available in multiple colors and sizes.",
    basePrice: 24.99,
    featured: true,
    tags: ["t-shirt", "logo", "classic"],
    variants: [
      { title: "Black / S", sku: "CLT-BLK-S", price: 24.99, optionValues: { Color: "Black", Size: "S" }, inStock: true },
      { title: "Black / M", sku: "CLT-BLK-M", price: 24.99, optionValues: { Color: "Black", Size: "M" }, inStock: true },
      { title: "Black / L", sku: "CLT-BLK-L", price: 24.99, optionValues: { Color: "Black", Size: "L" }, inStock: true },
      { title: "White / S", sku: "CLT-WHT-S", price: 24.99, optionValues: { Color: "White", Size: "S" }, inStock: true },
      { title: "White / M", sku: "CLT-WHT-M", price: 24.99, optionValues: { Color: "White", Size: "M" }, inStock: true },
      { title: "White / L", sku: "CLT-WHT-L", price: 24.99, optionValues: { Color: "White", Size: "L" }, inStock: true },
    ],
  },
  {
    slug: "premium-hoodie",
    title: "Premium Hoodie",
    description:
      "Stay warm in style with our heavyweight hoodie. Soft fleece interior with a relaxed fit.",
    basePrice: 54.99,
    featured: true,
    tags: ["hoodie", "premium", "winter"],
    variants: [
      { title: "Navy / M", sku: "PH-NVY-M", price: 54.99, optionValues: { Color: "Navy", Size: "M" }, inStock: true },
      { title: "Navy / L", sku: "PH-NVY-L", price: 54.99, optionValues: { Color: "Navy", Size: "L" }, inStock: true },
      { title: "Navy / XL", sku: "PH-NVY-XL", price: 54.99, optionValues: { Color: "Navy", Size: "XL" }, inStock: true },
      { title: "Gray / M", sku: "PH-GRY-M", price: 54.99, optionValues: { Color: "Gray", Size: "M" }, inStock: true },
      { title: "Gray / L", sku: "PH-GRY-L", price: 54.99, optionValues: { Color: "Gray", Size: "L" }, inStock: true },
    ],
  },
  {
    slug: "summer-cap",
    title: "Summer Cap",
    description:
      "A lightweight snapback cap perfect for sunny days. Adjustable strap fits all sizes.",
    basePrice: 19.99,
    featured: true,
    tags: ["cap", "hat", "summer", "accessories"],
    variants: [
      { title: "Black", sku: "SC-BLK", price: 19.99, optionValues: { Color: "Black" }, inStock: true },
      { title: "White", sku: "SC-WHT", price: 19.99, optionValues: { Color: "White" }, inStock: true },
      { title: "Red", sku: "SC-RED", price: 19.99, optionValues: { Color: "Red" }, inStock: true },
    ],
  },
  {
    slug: "canvas-tote",
    title: "Canvas Tote Bag",
    description:
      "A sturdy canvas tote bag for everyday carry. Spacious main compartment with inner pocket.",
    basePrice: 16.99,
    featured: false,
    tags: ["tote", "bag", "accessories", "canvas"],
    variants: [
      { title: "Natural", sku: "CT-NAT", price: 16.99, optionValues: { Color: "Natural" }, inStock: true },
      { title: "Black", sku: "CT-BLK", price: 16.99, optionValues: { Color: "Black" }, inStock: true },
    ],
  },
  {
    slug: "graphic-crewneck",
    title: "Graphic Crewneck Sweatshirt",
    description:
      "A midweight crewneck sweatshirt with bold graphic print. Perfect for layering.",
    basePrice: 39.99,
    featured: true,
    tags: ["sweatshirt", "crewneck", "graphic"],
    variants: [
      { title: "Charcoal / S", sku: "GC-CHR-S", price: 39.99, optionValues: { Color: "Charcoal", Size: "S" }, inStock: true },
      { title: "Charcoal / M", sku: "GC-CHR-M", price: 39.99, optionValues: { Color: "Charcoal", Size: "M" }, inStock: true },
      { title: "Charcoal / L", sku: "GC-CHR-L", price: 39.99, optionValues: { Color: "Charcoal", Size: "L" }, inStock: true },
      { title: "Forest / M", sku: "GC-FOR-M", price: 39.99, optionValues: { Color: "Forest", Size: "M" }, inStock: true },
      { title: "Forest / L", sku: "GC-FOR-L", price: 39.99, optionValues: { Color: "Forest", Size: "L" }, inStock: true },
    ],
  },
  {
    slug: "water-bottle",
    title: "Insulated Water Bottle",
    description:
      "A 20oz stainless steel insulated water bottle. Keeps drinks cold for 24 hours or hot for 12.",
    basePrice: 22.99,
    featured: false,
    tags: ["bottle", "accessories", "drinkware"],
    variants: [
      { title: "Matte Black", sku: "WB-MBLK", price: 22.99, optionValues: { Color: "Matte Black" }, inStock: true },
      { title: "White", sku: "WB-WHT", price: 22.99, optionValues: { Color: "White" }, inStock: true },
    ],
  },
  {
    slug: "phone-case-minimal",
    title: "Minimal Phone Case",
    description:
      "A slim, protective phone case with a clean minimal design. Available for popular models.",
    basePrice: 14.99,
    featured: false,
    tags: ["phone-case", "accessories", "minimal"],
    variants: [
      { title: "iPhone 15", sku: "PC-IP15", price: 14.99, optionValues: { Model: "iPhone 15" }, inStock: true },
      { title: "iPhone 15 Pro", sku: "PC-IP15P", price: 16.99, optionValues: { Model: "iPhone 15 Pro" }, inStock: true },
      { title: "Samsung S24", sku: "PC-SS24", price: 14.99, optionValues: { Model: "Samsung S24" }, inStock: true },
    ],
  },
  {
    slug: "embroidered-beanie",
    title: "Embroidered Beanie",
    description:
      "A cozy ribbed beanie with embroidered logo. One size fits most.",
    basePrice: 18.99,
    featured: false,
    tags: ["beanie", "hat", "winter", "accessories"],
    variants: [
      { title: "Black", sku: "EB-BLK", price: 18.99, optionValues: { Color: "Black" }, inStock: true },
      { title: "Burgundy", sku: "EB-BRG", price: 18.99, optionValues: { Color: "Burgundy" }, inStock: true },
      { title: "Gray", sku: "EB-GRY", price: 18.99, optionValues: { Color: "Gray" }, inStock: true },
    ],
  },
  {
    slug: "long-sleeve-vintage",
    title: "Vintage Long Sleeve",
    description:
      "A soft-washed long sleeve tee with vintage-inspired design. Relaxed fit for all-day comfort.",
    basePrice: 29.99,
    featured: true,
    tags: ["long-sleeve", "t-shirt", "vintage"],
    variants: [
      { title: "Cream / S", sku: "VLS-CRM-S", price: 29.99, optionValues: { Color: "Cream", Size: "S" }, inStock: true },
      { title: "Cream / M", sku: "VLS-CRM-M", price: 29.99, optionValues: { Color: "Cream", Size: "M" }, inStock: true },
      { title: "Cream / L", sku: "VLS-CRM-L", price: 29.99, optionValues: { Color: "Cream", Size: "L" }, inStock: true },
      { title: "Sage / M", sku: "VLS-SGE-M", price: 29.99, optionValues: { Color: "Sage", Size: "M" }, inStock: true },
      { title: "Sage / L", sku: "VLS-SGE-L", price: 29.99, optionValues: { Color: "Sage", Size: "L" }, inStock: false },
    ],
  },
  {
    slug: "sticker-pack",
    title: "Sticker Pack (5 pcs)",
    description:
      "A set of 5 vinyl die-cut stickers. Waterproof and weather-resistant.",
    basePrice: 8.99,
    featured: false,
    tags: ["stickers", "accessories", "pack"],
    variants: [
      { title: "Original Collection", sku: "SP-OG", price: 8.99, optionValues: { Collection: "Original" }, inStock: true },
      { title: "Neon Collection", sku: "SP-NEON", price: 8.99, optionValues: { Collection: "Neon" }, inStock: true },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  for (const product of products) {
    const { variants, ...productData } = product;

    const created = await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants,
        },
      },
    });

    console.log(`  Created: ${created.title} (${variants.length} variants)`);
  }

  const count = await prisma.product.count();
  console.log(`\nSeeded ${count} products successfully.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
