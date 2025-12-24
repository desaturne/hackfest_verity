const Blockchain = require("../blockchain/blockChain");
const Block = require("../blockchain/block");
const BlockModel = require("../models/blockModel");
const normalizeImage = require("../utils/normalizeImage");
const hashImage = require("../utils/hashImage");

const blockchain = new Blockchain();

exports.uploadEvidence = async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;
    const imageBuffer = await normalizeImage(req.file.buffer);

    const photoHash = hashImage(imageBuffer, {
      latitude,
      longitude,
      timestamp
    });

    const evidenceData = {
      photoHash,
      latitude,
      longitude,
      timestamp
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
      hash: photoHash
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEvidence = async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;
    const imageBuffer = await normalizeImage(req.file.buffer);

    const computedHash = hashImage(imageBuffer, {
      latitude,
      longitude,
      timestamp
    });

    const block = await BlockModel.findOne({
      "data.photoHash": computedHash
    });

    if (!block) {
      return res.json({ verified: false });
    }

    res.json({
      verified: true,
      blockIndex: block.index,
      timestamp: block.timestamp
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
