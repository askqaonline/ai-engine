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
  const VERIFY_TOKEN = "askqa313";  // MUST match webhook setup
  
  console.log("🔐 Webhook verification attempt:", req.query);
  
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    return res.send(challenge);  // Send challenge as plain text
  }
  
  console.log("❌ Webhook verification failed");
  res.sendStatus(403);
});

/* ==================================================
   META WEBHOOK MESSAGE RECEIVER
================================================== */
app.post("/webhook", async (req, res) => {
  // Respond immediately to Meta (within 20 seconds)
  res.sendStatus(200);
  
  console.log("📦 Received webhook:", JSON.stringify(req.body, null, 2));
  
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    
    if (!message) {
      console.log("⚠️ No message in webhook (could be status update)");
      return;
    }
    
    const from = message.from;  // User's phone number
    const text = message.text?.body || "";
    
    console.log("📩 New WhatsApp Message Received");
    console.log("From:", from);
    console.log("Text:", text);
    
    // ============ ASKQA LOGIC START ============
    
    // 1. Check if text is Tamil (basic check)
    if (text.trim().length < 5) {
      console.log("Text too short, ignoring");
      return;
    }
    
    console.log("🔄 Processing Tamil text...");
    
    // 2. Call your AI image generation endpoint
    const imageResponse = await fetch(`http://localhost:${process.env.PORT || 10000}/ai-generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    
    if (!imageResponse.ok) {
      console.error("❌ AI Image generation failed:", await imageResponse.text());
      return;
    }
    
    // 3. Get image buffer
    const imageBuffer = await imageResponse.buffer();
    
    // 4. Upload to WhatsApp Media
    const mediaUpload = await fetch(
      `https://graph.facebook.com/v18.0/935840042953167/media`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          type: "image/png",
          file: imageBuffer.toString("base64")
        })
      }
    );
    
    const mediaData = await mediaUpload.json();
    const mediaId = mediaData.id;
    
    console.log("📤 Media uploaded with ID:", mediaId);
    
    // 5. Send image to user
    const sendMessage = await fetch(
      `https://graph.facebook.com/v18.0/935840042953167/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: from,
          type: "image",
          image: {
            id: mediaId
          }
        })
      }
    );
    
    const result = await sendMessage.json();
    console.log("✅ Image sent successfully:", result);
    
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
  }
});

/* ==================================================
   HEALTH CHECK
================================================== */
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "ASKQA AI Image Engine",
    version: "1.0",
    endpoints: {
      webhook: "GET/POST /webhook",
      generate: "POST /ai-generate-image",
      health: "GET /"
    }
  });
});

/* ==================================================
   ASKQA IMAGE GENERATION API
================================================== */
app.post("/ai-generate-image", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        error: "Valid Tamil text is required (minimum 10 characters)"
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
              content: "Create a clean, minimal, India-style illustration background for a Tamil public information card. No text, no English words. Abstract visuals only."
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

    if (!promptResponse.ok) {
      throw new Error(`OpenAI prompt API failed: ${promptResponse.status}`);
    }

    const promptData = await promptResponse.json();
    const imagePrompt = promptData.choices[0].message.content.trim();
    console.log("🎨 Generated image prompt:", imagePrompt);

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
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json"
        })
      }
    );

    if (!imageResponse.ok) {
      throw new Error(`OpenAI image API failed: ${imageResponse.status}`);
    }

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
    res.setHeader("Content-Type", "image/png");
    res.sendFile("final.png", { root: process.cwd() });

  } catch (err) {
    console.error("❌ AI Generation Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
});

/* ==================================================
   START SERVER
================================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 ASKQA AI Image Engine running on port ${PORT}`);
  console.log(`🔗 Webhook URL: https://ai-engine-78zd.onrender.com/webhook`);
  console.log(`🔐 Verify Token: askqa313`);

});
