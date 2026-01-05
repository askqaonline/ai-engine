import { createCanvas, registerFont } from "canvas";
import fs from "fs";

// ✅ STATIC FONT (WORKS 100%)
registerFont("./fonts/NotoSansTamil-Regular.ttf", { family: "Tamil" });


const data = {
  title: "தமிழக அரசு புதிய அறிவிப்பு",
  points: [
    "புதிய விதிமுறை அமல்",
    "பொதுமக்களுக்கு பயன்பாடு",
    "ஜனவரி 10 முதல் அமல்"
  ]
};

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

fs.writeFileSync("card.png", canvas.toBuffer("image/png"));

console.log("Tamil image created successfully");
