const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

let configured = false;
if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true
  });
  configured = true;
  console.log('[cloudinaryService] configured Cloudinary');
} else {
  console.warn('[cloudinaryService] CLOUDINARY_* env vars missing; Cloudinary disabled');
}

async function uploadFile(filePath, options = {}) {
  if (!configured) return { ok: false, error: 'cloudinary_not_configured' };
  try {
    const opts = Object.assign({ folder: 'spgms/complaints', resource_type: 'image' }, options);
    const res = await cloudinary.uploader.upload(filePath, opts);
    return { ok: true, url: res.secure_url, public_id: res.public_id, raw: res };
  } catch (err) {
    console.error('[cloudinaryService] uploadFile error', err && err.message);
    return { ok: false, error: err && err.message };
  }
}

async function destroy(publicId) {
  if (!configured) return { ok: false, error: 'cloudinary_not_configured' };
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return { ok: true, result: res };
  } catch (err) {
    console.error('[cloudinaryService] destroy error', err && err.message);
    return { ok: false, error: err && err.message };
  }
}

module.exports = { uploadFile, destroy, configured };
