const express = require("express");
const mongoose = require("mongoose");
const evidenceRoutes = require("./routes/evidenceRoutes");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/verity");

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

app.use("/api/evidence", evidenceRoutes);

app.listen(5000, () =>
  console.log("Server running on port 5000")
);
