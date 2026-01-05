import express from "express";
import { createCanvas, registerFont } from "canvas";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ---------------- FONT ----------------
registerFont("./fonts/NotoSansTamil-Regular.ttf", {
  family: "Tamil"
});

// ---------------- IMAGE GENERATOR ----------------
function generateCard(data) {
  const canvas = createCanvas(1080, 1080);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1080, 1080);

  // Title
  ctx.fillStyle = "#000000";
  ctx.font = "50px Tamil";
  ctx.fillText(data.title, 60, 120);

  // Points
  ctx.font = "36px Tamil";
  let y = 220;
  for (const p of data.points) {
    ctx.fillText("• " + p, 60, y);
    y += 60;
  }

  return canvas.toBuffer("image/png");
}

// ---------------- EXISTING ENDPOINT ----------------
// JSON → Image (already working)
app.post("/generate-card", (req, res) => {
  const { title, points } = req.body;

  if (!title || !points) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const imageBuffer = generateCard({ title, points });
  res.setHeader("Content-Type", "image/png");
  res.send(imageBuffer);
});

// ---------------- NEW ENDPOINT ----------------
// Tamil Text → AI → Image
app.post("/ai-generate-card", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Call OpenAI
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You are a Tamil text processor. Convert the input Tamil text into ONE short title and 3–5 short bullet points. Output ONLY valid JSON in this format: {\"title\":\"\",\"points\":[]}"
          },
          { role: "user", content: text }
        ],
        temperature: 0.2
      })
    });

    const aiData = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    const imageBuffer = generateCard({
      title: parsed.title,
      points: parsed.points
    });

    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Image API running on port", PORT);
});
