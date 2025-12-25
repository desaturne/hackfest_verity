const Blockchain = require("../blockchain/blockChain");
const Block = require("../blockchain/block.js");
const BlockModel = require("../models/blockModel");
const normalizeImage = require("../utils/normalizeImage");
const hashImage = require("../utils/hashImage");

const blockchain = new Blockchain();

exports.uploadEvidence = async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }

    // Photo-only endpoint. Video is supported by extracting frames on the frontend
    // and sending those frames here as images.
    const imageBuffer = await normalizeImage(req.file.buffer);

    const photoHash = hashImage(imageBuffer, {
      latitude,
      longitude,
      timestamp,
    });

    const evidenceData = {
      type: "photo",
      photoHash,
      latitude,
      longitude,
      timestamp,
    };

    const newBlock = new Block(
      blockchain.chain.length,
      Date.now(),
      evidenceData
    );

    blockchain.addBlock(newBlock);

    await BlockModel.create(newBlock);

    res.json({
      success: true,
      blockIndex: newBlock.index,
      hash: photoHash,
      type: evidenceData.type,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEvidence = async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }

    const imageBuffer = await normalizeImage(req.file.buffer);

    const computedHash = hashImage(imageBuffer, {
      latitude,
      longitude,
      timestamp,
    });

    const query = {
      "data.photoHash": computedHash,
    };

    const block = await BlockModel.findOne(query);

    if (!block) {
      return res.json({ verified: false });
    }

    res.json({
      verified: true,
      blockIndex: block.index,
      timestamp: block.timestamp,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
