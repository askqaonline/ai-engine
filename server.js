import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { generateAskqaImage } from "./image.js";

const app = express();
app.use(express.json());

// --------------------------------------------------
// WEBHOOK VERIFICATION (META)
// --------------------------------------------------
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "askqa_313";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------
app.get("/", (req, res) => {
  res.send("ASKQA AI Image Engine is running ✅");
});

// --------------------------------------------------
// ASKQA IMAGE API
// --------------------------------------------------
app.post("/ai-generate-image", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        error: "Valid Tamil text is required"
      });
    }

    // (your existing OpenAI + image logic stays EXACTLY the same)

    res.sendFile("final.png", {
      root: process.cwd(),
      headers: { "Content-Type": "image/png" }
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`ASKQA AI Image Engine running on port ${PORT}`);
});
