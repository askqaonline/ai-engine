import express from "express";
import { createCanvas, registerFont } from "canvas";
import fs from "fs";

const app = express();
app.use(express.json());

// Register Tamil font (Linux-safe)
registerFont("./fonts/NotoSansTamil-Regular.ttf", {
  family: "Tamil"
});

// Image generator function
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

// API endpoint
app.post("/generate-card", (req, res) => {
  const { title, points } = req.body;

  if (!title || !points) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const imageBuffer = generateCard({ title, points });

  res.setHeader("Content-Type", "image/png");
  res.send(imageBuffer);
});

// Render provides PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Image API running on port", PORT);
});
