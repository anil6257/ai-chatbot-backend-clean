const fs = require("fs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

// ---------- Load FAQ data ----------
let faq = [];
try {
  const faqRaw = fs.readFileSync("faq.json", "utf8");
  faq = JSON.parse(faqRaw);
  console.log(`Loaded ${faq.length} FAQ entries.`);
} catch (err) {
  console.error("Could not load faq.json. Make sure the file exists and is valid JSON.");
  faq = [];
}

const app = express();
app.use(cors());
app.use(express.json());

// ---------- OpenAI Client ----------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helper: FAQ Matcher ----------
function findFAQ(message) {
  if (!message || !faq.length) return null;
  const text = message.toLowerCase().trim();

  // 1) CONTACT-related detection
  if (
    text.includes("contact number") ||
    text.includes("whatsapp number") ||
    text.includes("whats app number") ||
    text.includes("phone number") ||
    text.includes("mobile number") ||
    text.includes("call you") ||
    text.includes("call sir") ||
    text.includes("can i call") ||
    text.includes("how can i contact") ||
    (text.includes("number") && (text.includes("call") || text.includes("contact") || text.includes("whatsapp")))
  ) {
    const contactFaq = faq.find((item) => {
      const q = (item.q || "").toLowerCase();
      return q.includes("contact number") || q.includes("can i call");
    });
    if (contactFaq) return contactFaq.a;
  }

  // 2) PAYMENT-related detection
  if (
    text.includes("payment") ||
    text.includes("pay") ||
    text.includes("fees") ||
    text.includes("price") ||
    text.includes("amount") ||
    text.includes("cost") ||
    text.includes("discount") ||
    text.includes("offer") ||
    text.includes("upi") ||
    text.includes("bank") ||
    text.includes("transaction") ||
    text.includes("payment link") ||
    text.includes("link for payment")
  ) {
    const paymentFaq = faq.find((item) =>
      (item.q || "").toLowerCase().includes("payment instructions")
    );
    if (paymentFaq) return paymentFaq.a;
  }

  // 3) PROGRAM START detection
  if (
    text.includes("when program will start") ||
    text.includes("when will program start") ||
    text.includes("kab se") ||
    (text.includes("when") && text.includes("start"))
  ) {
    const startFaq = faq.find((item) =>
      (item.q || "").toLowerCase().includes("when will the program start")
    );
    if (startFaq) return startFaq.a;
  }

  // 4) Generic keyword-based matching across FAQ
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

// ---------- Health Check ----------
app.get("/", (req, res) => {
  res.send("AI Chatbot Backend is running ✅");
});

// ---------- Main Chat Endpoint ----------
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = (req.body.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    // 1) Try FAQ first
    const faqAnswer = findFAQ(userMessage);
    if (faqAnswer) {
      return res.json({ reply: faqAnswer });
    }

    // 2) Fallback to GPT (only about 21-Day Angel Manifestation Bootcamp)
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant ONLY for Dr. Nitin Mohan Lal’s 21-Day Angel Manifestation Bootcamp (also called 21-Day Inner Image Improvement Program).

IMPORTANT LIMITS:
- Do NOT talk about other programs like Tibetan Breathology, Angel Happiness Program, 9-step, or any advanced courses.
- If the user asks about any other program, say you can only guide about the 21-Day Angel Manifestation Bootcamp and suggest they contact support on WhatsApp.

CONTACT & PAYMENT RULES:
- Official WhatsApp support number: +919971400377.
- This WhatsApp number is ONLY for communication and support.
- NEVER tell the user to pay money on WhatsApp, UPI, or to any personal number.
- ALWAYS say: “Please pay ONLY using the official payment buttons or links on this page.”
- If user asks for UPI, bank details, or to pay directly on WhatsApp, clearly say that payments must be done only via the official buttons or links on this page.

PROGRAM DETAILS (21-Day Angel Manifestation Bootcamp):
- A 21-day guided program to transform the inner image, heal emotional blocks, and align energy using angels, meditation, affirmations, and mindset work.
- Includes: Divine You Meditation, Angel Affirmations, Understanding Angels, Aura Cleaning, Chakra Assessment, Vibration & Frequency Work, Self-Love & Forgiveness, Setting Boundaries, Manifestation Techniques for health, relationships and money.
- Learning format: pre-recorded videos that can be watched anytime.
- Live support/Q&A sessions: usually once a week in the evening.
- Language: mainly Hindi / Hinglish.
- Access activation: typically within 24 hours after payment.
- Recording validity: usually 21 days from activation (not lifetime).
- Counselors and support team help with doubts.

PLANS (example structure):
- Basic – ₹699: pre-recorded content only.
- Standard – ₹999: pre-recorded content + counselor support.
- Premium – ₹1038: pre-recorded content + counselor support + live Q&A and angel blessing–type support.

IMPORTANT: If the user asks for the exact current price, always say:
“The most accurate and current price is shown on the payment button on this page. Offers may change, so please follow the price you can see on the button.”

SAFETY & ETHICS:
- No demo classes.
- No refund policy.
- Do not share Nitin sir’s personal number.
- This program does not replace medical treatment, doctors or professional therapy.
- Never claim that angels or the program can cure diseases like cancer or diabetes.

TONE:
- Warm, gentle, simple, spiritual, and encouraging.
- Keep answers short and clear (around 3–6 sentences).
- Use simple English or Hinglish depending on how the user writes.
- You may use 1 emoji occasionally (like 🙏, 😊, 💫) if it feels natural.

IF YOU ARE NOT SURE:
If you are not fully sure about a detail (like current offer or exact timing), say:
“I’m not fully sure about this specific detail. Please check the information on this page or message our support team on WhatsApp at +919971400377 for confirmation.”`
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
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
