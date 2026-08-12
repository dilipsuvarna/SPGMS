/* Upload a specified file to Cloudinary using the project's cloudinaryService.
   Usage: node scripts/upload_file.js "C:\path\to\file.png"
*/
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const cloudinaryService = require('../src/services/cloudinaryService');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/upload_file.js "C:\\path\\to\\file.png"');
    process.exit(1);
  }

  if (!cloudinaryService.configured) {
    console.error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
    process.exit(2);
  }

  console.log('[upload_file] uploading', filePath);
  const res = await cloudinaryService.uploadFile(filePath);
  console.log('[upload_file] result', res);
  if (res.ok) process.exit(0);
  else process.exit(3);
}

main().catch(err => { console.error(err); process.exit(10); });
