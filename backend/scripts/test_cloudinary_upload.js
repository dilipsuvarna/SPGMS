/*
  Test Cloudinary upload by creating a tiny PNG and uploading it.
  Usage: node scripts/test_cloudinary_upload.js
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const cloudinaryService = require('../src/services/cloudinaryService');

async function main() {
  if (!cloudinaryService.configured) {
    console.error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
    process.exit(1);
  }

  // tiny 1x1 png base64
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const buf = Buffer.from(b64, 'base64');
  const tmp = path.join(os.tmpdir(), `spgms-test-${Date.now()}.png`);
  fs.writeFileSync(tmp, buf);
  console.log('Created tmp file', tmp);

  const res = await cloudinaryService.uploadFile(tmp);
  console.log('Upload result', res);

  // cleanup local tmp
  try { fs.unlinkSync(tmp); } catch(e){}

  if (res.ok) {
    console.log('Cloudinary upload succeeded, secure URL:', res.url);
    // Optionally destroy to keep account clean
    // await cloudinaryService.destroy(res.public_id);
    process.exit(0);
  } else {
    console.error('Cloudinary upload failed', res.error);
    process.exit(2);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
