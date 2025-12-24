const mongoose = require("mongoose");

const BlockSchema = new mongoose.Schema({
  index: Number,
  timestamp: Number,
  data: Object,
  previousHash: String,
  hash: String,
  nonce: Number
});

module.exports = mongoose.model("Block", BlockSchema);
