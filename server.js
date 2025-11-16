const fs = require("fs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

// Load FAQ data from faq.json (must be in same folder)
let faq = [];
try {
  const faqRaw = fs.readFileSync("faq.json", "utf8");
  faq = JSON.parse(faqRaw);
} catch (err) {
  console.error("Could not load faq.json. Make sure the file exists and is valid JSON.");
  faq = [];
}

const app = express();
app.use(cors());           // allow requests from your frontend (FlexiFunnels)
app.use(express.json());   // parse JSON bodies

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------- Helper: FAQ matcher ---------
function findFAQ(message) {
  if (!message || !faq.length) return null;

  const text = message.toLowerCase();

  // Very simple keyword-based matcher:
  // For each FAQ question, split into words and see if some important word appears in user text
  for (const item of faq) {
    const question = (item.q || "").toLowerCase();
    const keywords = question.split(/\s+/).filter((w) => w.length > 3); // ignore tiny words

    for (const kw of keywords) {
      if (text.includes(kw)) {
        return item.a;
      }
    }
  }

  return null;
}

// --------- Health check route ---------
app.get("/", (req, res) => {
  res.send("AI Chatbot Backend is running ✅");
});

// --------- Main chat endpoint ---------
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = (req.body.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    // 1) Try FAQ first (cheap + consistent)
    const faqAnswer = findFAQ(userMessage);
    if (faqAnswer) {
      return res.json({ reply: faqAnswer });
    }

    // 2) Fall back to OpenAI for everything else
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Dr. Nitin Mohan Lal’s 21-Day Inner Image Improvement / Angel Manifestation Program.

Your responsibilities:

1. Answer ONLY based on the official program details listed below.
2. Always reply clearly, politely, and concisely, in simple English or light Hinglish (whichever seems natural).
3. If someone asks anything outside program topics, gently redirect to program benefits and suggest they contact the human support team if needed.
4. NEVER give medical, legal, or financial advice.
5. If asked about payments, always direct them to official payment links or say “please use only the links on this page to pay.”
6. If asked for Nitin Sir’s personal number, say it cannot be shared and mention that consultations are high-ticket and limited.

PROGRAM DETAILS:
- Starts within 24 hours of payment.
- Access is usually shared by counselor via phone call and/or email/WhatsApp.
- Learning is through pre-recorded videos.
- Live classes are usually on Saturdays at around 9 PM (3 main Q&A / support sessions).
- Recording validity is 21 days only (not lifetime).
- Language: mostly Hindi / Hinglish.
- Counselors are available to help with doubts.
- No refunds.
- No trial/demo classes.
- 15,000+ students have already benefited from Nitin Sir’s courses and programs.
- Program works when student follows instructions and takes action consistently.
- Not app-based; access is via web platform.
- Higher-level courses exist (like 9-step, advanced programs) but are optional and separate.
- Program includes: Divine You Meditation, Angel Affirmations, Chakra Assessment, Aura Cleaning, Vibration/Frequency Work, Self-Love & Self-Forgiveness, Setting Boundaries, Manifestation Techniques for health, relationships and money.

PLANS & PRICING (example structure):
- Basic – ₹699: Pre-recorded content only.
- Standard – ₹999: Pre-recorded + counselor support.
- Premium – ₹1038 (Recommended): Pre-recorded + counselor + live Q&A + angel blessing type support.

NOTE: Exact prices and bonuses can change with offers, so if the user asks “what is the exact price right now?” tell them to check the button/price on the current page.

GENERAL RULES:
- No demo classes.
- No personal number of sir is shared.
- Activation and access can take some time (up to 24 hours), but the team supports via WhatsApp/call.
- No magical instant results; results require consistent practice.
- Angels and spiritual work do NOT replace doctors, medicines or medical treatment.

TONE:
You are warm, gentle, encouraging, spiritual, and trustworthy. You talk like a caring guide for modern Indians (30–55 age group, professionals, homemakers, business owners).

If you are not sure about something, say:
“I’m not fully sure about this specific detail. Please check with the human counselor or support team on WhatsApp for confirmation.”`
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
    console.error("Error in /api/chat:");
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
      return res.status(500).json({ error: error.response.data });
    } else {
      console.error(error.message || error);
      return res.status(500).json({ error: error.message || "Something went wrong." });
    }
  }
});

// --------- Start server ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
