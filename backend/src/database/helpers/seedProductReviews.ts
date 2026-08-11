import { sequelize } from '../../config/database';

export async function seedProductReviews() {
  const [products]: any = await sequelize.query('SELECT id, name FROM products LIMIT 50');

  if (!products || products.length === 0) {
    console.log('No products found to seed reviews.');
    return;
  }

  const reviewTemplates = [
    {
      rating: 5,
      title: 'Outstanding Quality & Fast Shipping!',
      comment:
        'Extremely satisfied with this purchase. Premium quality material, matched description perfectly, and arrived sooner than expected. Highly recommended!',
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav.sharma@example.com',
      verifiedPurchase: true,
      helpfulCount: 14,
    },
    {
      rating: 5,
      title: 'Exceeded My Expectations!',
      comment:
        'Top-notch build quality and flawless user experience. Comzilo store delivered it safely with pristine packaging. Will definitely buy again!',
      customerName: 'Priya Patel',
      customerEmail: 'priya.patel@example.com',
      verifiedPurchase: true,
      helpfulCount: 9,
    },
    {
      rating: 4,
      title: 'Great Product, Highly Functional',
      comment:
        'Very good product overall. Does everything advertised smoothly. Minor suggestion on packaging, but otherwise 10/10 experience.',
      customerName: 'Rohan Verma',
      customerEmail: 'rohan.v@example.com',
      verifiedPurchase: true,
      helpfulCount: 6,
    },
    {
      rating: 5,
      title: 'Must-Have Item!',
      comment:
        'Worth every rupee spent! Super easy to use, highly durable, and elegant design. Friends have already asked where I got it.',
      customerName: 'Ananya Reddy',
      customerEmail: 'ananya.reddy@example.com',
      verifiedPurchase: true,
      helpfulCount: 11,
    },
    {
      rating: 4,
      title: 'Solid Purchase',
      comment:
        'Great value for money. Delivery was fast and customer service answered my questions promptly.',
      customerName: 'Vikram Singh',
      customerEmail: 'vikram.singh@example.com',
      verifiedPurchase: true,
      helpfulCount: 4,
    },
  ];

  let count = 0;
  for (const prod of products) {
    // Add 2-3 reviews per product
    const reviewCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < reviewCount; i++) {
      const template = reviewTemplates[(prod.id + i) % reviewTemplates.length];
      await sequelize.query(
        `INSERT INTO product_reviews (tenant_id, store_id, product_id, customer_name, customer_email, rating, title, comment, verified_purchase, status, helpful_count, created_at, updated_at)
         VALUES (1, 1, :productId, :customerName, :customerEmail, :rating, :title, :comment, :verifiedPurchase, 'approved', :helpfulCount, NOW(), NOW())`,
        {
          replacements: {
            productId: prod.id,
            customerName: template.customerName,
            customerEmail: template.customerEmail,
            rating: template.rating,
            title: template.title,
            comment: template.comment,
            verifiedPurchase: template.verifiedPurchase,
            helpfulCount: template.helpfulCount,
          },
        }
      );
      count++;
    }
  }

  console.log(
    `✅ Successfully seeded ${count} customer product reviews across ${products.length} products!`
  );
}

if (require.main === module) {
  seedProductReviews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
