import express from "express";

const app = express();
app.use(express.json());

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------
app.get("/", (req, res) => {
  res.send("ASKQA AI Image Engine is running ✅");
});

// --------------------------------------------------
// AI IMAGE GENERATION
// Tamil text → AI → FULL IMAGE (ChatGPT style)
// --------------------------------------------------
app.post("/ai-generate-image", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        error: "Valid Tamil text is required"
      });
    }

    // --------------------------------------------------
    // STEP 1: CREATE IMAGE PROMPT (Tamil → English visual idea)
    // --------------------------------------------------
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
                "Convert the Tamil information into ONE clear English description for an informative illustration. Focus on scene, objects, mood. Do not include any text in the image. One short paragraph only."
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

    if (!promptData?.choices?.[0]?.message?.content) {
      console.error("PROMPT ERROR:", promptData);
      return res.status(500).json({
        error: "Prompt generation failed",
        details: promptData
      });
    }

    const imagePrompt = promptData.choices[0].message.content.trim();

    // --------------------------------------------------
    // STEP 2: GENERATE IMAGE (Prompt → Image)
    // --------------------------------------------------
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

    // 🔥 IMPORTANT DEBUG LOG (keep this)
    console.log("OPENAI IMAGE RESPONSE:", JSON.stringify(imageData, null, 2));

    if (imageData.error) {
      return res.status(500).json({
        error: "OpenAI Image API error",
        details: imageData.error
      });
    }

    if (!imageData?.data?.[0]?.b64_json) {
      return res.status(500).json({
        error: "No image returned by OpenAI",
        details: imageData
      });
    }

    const imageBuffer = Buffer.from(
      imageData.data[0].b64_json,
      "base64"
    );

    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
});

// --------------------------------------------------
// SERVER START
// --------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`ASKQA AI Image Engine running on port ${PORT}`);
});

//https://askqa-ai.onrender.com/ai-generate-image?Content-Type=application%2Fjson
