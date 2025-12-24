const sharp = require("sharp");

async function normalizeImage(buffer) {
  return await sharp(buffer)
    .resize(1024, 1024, { fit: "inside" })
    .jpeg({
      quality: 100,
      mozjpeg: true
    })
    .toBuffer();
}

module.exports = normalizeImage;
