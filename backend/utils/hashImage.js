const crypto = require("crypto");

function hashImage(imageBuffer, metadata) {
  const { latitude, longitude, timestamp } = metadata;

  return crypto
    .createHash("sha256")
    .update(
      imageBuffer +
      latitude.toString() +
      longitude.toString() +
      timestamp
    )
    .digest("hex");
}

module.exports = hashImage;
