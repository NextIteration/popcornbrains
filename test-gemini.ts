import dotenv from "dotenv";
dotenv.config({ override: true });
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

console.log("KEY LENGTH:", apiKey?.length);
console.log("KEY START:", apiKey?.slice(0, 10));

console.log("========== GEMINI TEST ==========");

if (!apiKey) {
  console.log("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

console.log("✅ API key found");

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash-lite",
});

console.log("✅ Model initialized");
console.log("🔥 Sending test request...");

try {
  const result = await model.generateContent(
    "Reply with exactly: GEMINI_WORKING"
  );

  console.log("🔥 Gemini responded!");

  const response = result.response;
  const text = response.text();

  console.log("========== GEMINI OUTPUT ==========");
  console.log(text);
  console.log("===================================");

  if (text.trim() === "GEMINI_WORKING") {
    console.log("✅ GEMINI TEST PASSED");
  } else {
    console.log("⚠️ Gemini responded, but output was unexpected");
  }
} catch (error) {
  console.log("❌ GEMINI REQUEST FAILED");
  console.error(error);
}