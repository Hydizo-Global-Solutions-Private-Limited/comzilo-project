const fs = require('fs');
const path = require('path');

async function downloadCleanTshirt() {
  const filePath = path.join(__dirname, '..', 'public', 'uploads', 'products', 'tshirt_white_real.jpg');
  console.log('Downloading clean white t-shirt photo...');
  const res = await fetch('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80');
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  console.log('Successfully saved clean white t-shirt photo! Size:', buffer.length);
}

downloadCleanTshirt().catch(console.error);
