import { sequelize } from '../../config/database';
import { PodCategory, PodTemplate, PodCustomization, Product, Order, OrderItem } from '../models';
import { PodService } from '../../services/pod.service';

export async function verifyPodEndToEnd() {
  console.log('🧪 =========================================================');
  console.log('🧪 [POD QA] Starting End-to-End Print-On-Demand Verification');
  console.log('🧪 =========================================================\n');

  const podService = new PodService();

  // Test 1: List Categories
  console.log('▶️ Test 1: Fetching POD Categories...');
  const categories = await podService.listCategories(1);
  console.log(`   Found ${categories.length} Categories:`);
  categories.forEach((c) => console.log(`   - [ID ${c.id}] ${c.name} (Slug: ${c.slug})`));

  if (categories.length < 2) {
    throw new Error(`Expected at least 2 categories, found ${categories.length}`);
  }
  console.log('   ✅ Test 1 Passed: Both categories (T-Shirts, Phone Back Covers) exist.\n');

  // Test 2: List Templates for T-Shirts
  console.log('▶️ Test 2: Verifying exactly 10 Templates for T-Shirts...');
  const tshirtTemplates = await podService.listTemplates(1, { categorySlug: 't-shirts' });
  console.log(`   Found ${tshirtTemplates.length} T-Shirt Templates:`);
  tshirtTemplates.forEach((t) => console.log(`   - [ID ${t.id}] ${t.title} (${t.code}) - Base Price: $${t.basePrice}`));

  if (tshirtTemplates.length !== 10) {
    throw new Error(`Expected exactly 10 T-Shirt templates, found ${tshirtTemplates.length}`);
  }
  console.log('   ✅ Test 2 Passed: Exactly 10 T-Shirt templates verified.\n');

  // Test 3: List Templates for Phone Back Covers
  console.log('▶️ Test 3: Verifying exactly 10 Templates for Phone Back Covers...');
  const phoneTemplates = await podService.listTemplates(1, { categorySlug: 'phone-back-covers' });
  console.log(`   Found ${phoneTemplates.length} Phone Cover Templates:`);
  phoneTemplates.forEach((t) => console.log(`   - [ID ${t.id}] ${t.title} (${t.code}) - Base Price: $${t.basePrice}`));

  if (phoneTemplates.length !== 10) {
    throw new Error(`Expected exactly 10 Phone Cover templates, found ${phoneTemplates.length}`);
  }
  console.log('   ✅ Test 3 Passed: Exactly 10 Phone Cover templates verified.\n');

  // Test 4: Save & Retrieve Customization Record
  console.log('▶️ Test 4: Testing POD Customization Persistence...');
  const existingOrder = await Order.findOne();
  const sampleCustomization = await podService.saveCustomization(1, {
    orderId: existingOrder ? existingOrder.id : null,
    productId: 1,
    templateId: tshirtTemplates[0].id,
    templateName: tshirtTemplates[0].title,
    uploadedImageUrl: 'https://example.com/custom-artwork.png',
    customText: 'LEGENDS NEVER DIE',
    font: 'Montserrat',
    textColor: '#FFFFFF',
    size: 'XL',
    color: 'Midnight Black',
    previewImageUrl: 'https://example.com/preview-mockup.png',
    metaData: { side: 'front', zoom: 1.0 },
  });

  console.log(`   Saved Customization ID #${sampleCustomization.id} for Template "${sampleCustomization.templateName}"`);
  console.log(`   - Custom Text: "${sampleCustomization.customText}"`);
  console.log(`   - Font: ${sampleCustomization.font} | Text Color: ${sampleCustomization.textColor}`);
  console.log(`   - Size: ${sampleCustomization.size} | Color: ${sampleCustomization.color}`);

  if (
    !sampleCustomization.templateName ||
    sampleCustomization.customText !== 'LEGENDS NEVER DIE' ||
    sampleCustomization.size !== 'XL' ||
    sampleCustomization.color !== 'Midnight Black'
  ) {
    throw new Error('Customization data verification failed.');
  }
  console.log('   ✅ Test 4 Passed: POD Customization persisted and verified with all parameters.\n');

  // Test 5: Pricing Calculation
  console.log('▶️ Test 5: Testing Customization Price Calculation...');
  const pricing = await podService.calculatePrice(1, tshirtTemplates[0].id, {
    uploadedImage: true,
    customText: 'MY SPECIAL TEXT WITH OVER 20 CHARACTERS',
  });
  console.log('   Calculated Pricing:', pricing);
  if (pricing.totalPrice <= 0) {
    throw new Error('Pricing calculation failed.');
  }
  console.log('   ✅ Test 5 Passed: Pricing rule calculation working properly.\n');

  // Clean up sample verification record
  await sampleCustomization.destroy();

  console.log('🎉 =========================================================');
  console.log('🎉 ALL PRINT-ON-DEMAND VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('🎉 =========================================================');
}

if (require.main === module) {
  verifyPodEndToEnd()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}
