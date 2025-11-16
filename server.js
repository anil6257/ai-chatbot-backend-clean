const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());          // allow requests from your FlexiFunnels domain
app.use(express.json());  // parse JSON bodies

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple health check route (optional)
app.get("/", (req, res) => {
  res.send("AI Chatbot Backend is running ✅");
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message || "";

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant for a spiritual coaching business. " +
            "You answer questions about the 21-Day Inner Image Program, Angel Happiness Program, and Tibetan Breathology. " +
            "Be clear, kind, and concise. If you are not sure, say you are not sure.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
