import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import generateAskqaImage from "./image.js";

const app = express();
app.use(express.json());

/* ==================================================
   META WEBHOOK VERIFICATION
================================================== */
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "askqa_313";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/* ==================================================
   HEALTH CHECK
================================================== */
app.get("/", (req, res) => {
  res.send("ASKQA AI Image Engine is running ✅");
});

/* ==================================================
   ASKQA IMAGE GENERATION API
================================================== */
app.post("/ai-generate-image", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        error: "Valid Tamil text is required"
      });
    }

    /* ---------- STEP 1: TEXT → IMAGE PROMPT ---------- */
    const promptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Create a clean, minimal, India-style illustration background for a Tamil public information card. No text, no English words. Abstract visuals only."
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.3
        })
      }
    );

    const promptData = await promptResponse.json();
    const imagePrompt = promptData.choices[0].message.content.trim();

    /* ---------- STEP 2: BACKGROUND IMAGE ---------- */
    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: imagePrompt,
          size: "1024x1024"
        })
      }
    );

    const imageData = await imageResponse.json();
    const bgBuffer = Buffer.from(imageData.data[0].b64_json, "base64");
    fs.writeFileSync("card.png", bgBuffer);

    /* ---------- STEP 3: TEXT SPLIT ---------- */
    const lines = text.split("\n").map(t => t.trim()).filter(Boolean);
    const title = lines[0];
    const points = lines.slice(1, 5);

    /* ---------- STEP 4: FINAL CARD ---------- */
    await generateAskqaImage({
      backgroundImage: "card.png",
      outputImage: "final.png",
      title,
      points
    });

    /* ---------- STEP 5: SEND IMAGE ---------- */
    return res.sendFile("final.png", {
      root: process.cwd(),
      headers: { "Content-Type": "image/png" }
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
});

/* ==================================================
   START SERVER
================================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`ASKQA AI Image Engine running on port ${PORT}`);
});
