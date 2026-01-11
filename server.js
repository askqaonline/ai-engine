import express from "express";
import { createCanvas, registerFont } from "canvas";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ---------------- FONT ----------------
registerFont("./fonts/NotoSansTamil-Regular.ttf", {
  family: "Tamil"
});

// ---------------- TEXT WRAP HELPER ----------------
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

// ---------------- TEXT CARD RENDERER (KEEP) ----------------
function generateCard(data) {
  const canvas = createCanvas(1080, 1080);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "#000000";
  ctx.font = "50px Tamil";
  drawWrappedText(ctx, data.title, 60, 120, 960, 64);

  ctx.font = "36px Tamil";
  let y = 220;

  for (const p of data.points) {
    y = drawWrappedText(ctx, "• " + p, 60, y, 960, 52);
    y += 10;
  }

  return canvas.toBuffer("image/png");
}

// ---------------- ENDPOINT 1 ----------------
// Manual title + points → text card
app.post("/generate-card", (req, res) => {
  const { title, points } = req.body;

  if (!title || !points) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const imageBuffer = generateCard({ title, points });
  res.setHeader("Content-Type", "image/png");
  res.send(imageBuffer);
});

// ---------------- ENDPOINT 2 ----------------
// Tamil text → AI → text card
app.post("/ai-generate-card", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Convert Tamil text into ONE short title and 3–5 bullet points. Output ONLY JSON: {\"title\":\"\",\"points\":[]}"
          },
          { role: "user", content: text }
        ],
        temperature: 0.2
      })
    });

    const aiData = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    const imageBuffer = generateCard(parsed);
    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI text card failed" });
  }
});

// ---------------- ENDPOINT 3 (NEW, IMPORTANT) ----------------
// Tamil text → AI → FULL AI IMAGE (ChatGPT style)
app.post("/ai-generate-image", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // ---- STEP 1: PROMPT GENERATION ----
    const promptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Convert the Tamil text into ONE short English description for an informative illustration. No JSON. No quotes. One sentence only."
            },
            { role: "user", content: text }
          ],
          temperature: 0.3
        })
      }
    );

    const promptData = await promptResponse.json();

    if (
      !promptData ||
      !promptData.choices ||
      !promptData.choices[0] ||
      !promptData.choices[0].message
    ) {
      console.error("Prompt API error:", promptData);
      return res.status(500).json({ error: "Prompt generation failed" });
    }

    const imagePrompt = promptData.choices[0].message.content.trim();

    // ---- STEP 2: IMAGE GENERATION ----
    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

    if (
      !imageData ||
      !imageData.data ||
      !imageData.data[0] ||
      !imageData.data[0].b64_json
    ) {
      console.error("Image API error:", imageData);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const imageBuffer = Buffer.from(
      imageData.data[0].b64_json,
      "base64"
    );

    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);

  } catch (err) {
    console.error("Server crash:", err);
    res.status(500).json({ error: "AI image generation failed" });
  }
});

