import fs from 'fs';
import path from 'path';

const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787304077356.png';
const targetPath = path.resolve('public/pod/pod_tmpl_urban_cyber.png');

fs.copyFileSync(sourceImagePath, targetPath);
console.log('Successfully copied NEVER GIVE UP artwork to:', targetPath);
