import { createCanvas, registerFont, loadImage } from "canvas";
import fs from "fs";
import path from "path";

/* ===============================
   FONT REGISTRATION (ONCE)
================================ */
registerFont(
  path.resolve("fonts/NotoSansTamil-Regular.ttf"),
  { family: "Tamil" }
);

/* ===============================
   TEXT WRAP FUNCTION
================================ */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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
  return y;
}

/* ===============================
   MAIN ASKQA IMAGE GENERATOR
================================ */
export default async function generateAskqaImage({
  backgroundImage,
  outputImage,
  title,
  points
}) {
  const width = 1080;
  const height = 1080;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* ---------- BACKGROUND ---------- */
  if (backgroundImage && fs.existsSync(backgroundImage)) {
    const bg = await loadImage(backgroundImage);
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  /* ---------- DARK OVERLAY ---------- */
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, width, height);

  /* ---------- TEXT STYLE ---------- */
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;

  /* ---------- TITLE ---------- */
  ctx.font = "64px Tamil";
  let currentY = 100;
  currentY = wrapText(ctx, title, 60, currentY, 960, 80);
  currentY += 40;

  /* ---------- BULLET POINTS ---------- */
  ctx.font = "42px Tamil";
  for (const point of points) {
    currentY = wrapText(
      ctx,
      "• " + point,
      60,
      currentY,
      960,
      60
    );
    currentY += 20;
  }

  /* ---------- FOOTER ---------- */
  ctx.font = "32px Tamil";
  ctx.fillText("ASKQA தகவல் அட்டை", 60, height - 80);

  /* ---------- SAVE IMAGE ---------- */
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputImage, buffer);
}
