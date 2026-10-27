import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import axios from "axios";

// Fast models, tried in order. Thinking is turned off for speed.
const MODELS = [
  { name: "gemini-2.5-flash", timeout: 10000, noThinking: true },
  { name: "gemini-2.5-flash-lite", timeout: 10000, noThinking: true },
  { name: "gemini-flash-lite-latest", timeout: 12000, noThinking: false },
];

// Fall back when there is no response (timeout / network)
// or when the model is unavailable or overloaded.
const shouldFallback = (error) => {
  if (!error.response) return true;
  return [404, 408, 429, 500, 502, 503, 504].includes(error.response.status);
};

const callModel = ({ name, timeout, noThinking }, prompt, apiKey) => {
  const generationConfig = { responseMimeType: "application/json" };

  if (noThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      timeout,
    }
  );
};

const extractText = (data) =>
  data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing from the backend .env file");
    }

    const prompt = `
You are a virtual voice assistant named "${assistantName}".
You were created by "${userName}".

Your job is to understand the user's natural-language voice command
and identify the user's intent.

Return ONLY a valid JSON object.
Do NOT return Markdown or extra fields.

The JSON format must be:
{
  "type": "the intent of the user, one of the allowed types below",
  "userInput": "string, the original sentence the user spoke",
  "response": "string, a short voice-friendly reply, e.g. 'Sure, opening YouTube' or 'Today is Thursday'"
}

ALLOWED TYPES (use these exact spellings):

1. "general": Normal factual, conversational, or informational questions. If you know the answer, answer it briefly in "response" and use this type. Also use this type for anything you cannot do (say so politely in "response").
2. "google_search": Search something on Google or the web.
3. "youtub_search": Search for something on YouTube, or open YouTube.
4. "youtub_play": Play a specific song or video on YouTube.
5. "get_time": Ask for the current time.
6. "get_date": Ask for today's date.
7. "get_day": Ask what day it is.
8. "get_month": Ask what month it is.
9. "calculator_open": Open a calculator.
10. "instagram_open": Open Instagram.
11. "facebook_open": Open Facebook.
12. "weather_show": Ask about the weather.

For Google searches, userInput must contain only the search query.
For YouTube searches, userInput must contain only the search query.
For YouTube playback, userInput must contain only the song or video name.
Remove the assistant name if the user addresses you by name.
Keep the response short, natural, and voice-friendly.

CREATOR RULE:

If the user asks "Who created you?", "Who made you?",
"Who is your creator?", "Who developed you?", or "Who told you this?",
respond using "${userName}".

Example:
{
  "type": "general",
  "userInput": "who created you",
  "response": "I was created by ${userName}."
}

Return exactly these three fields: type, userInput, response.

Process this command:
${command}
`;

    let result;
    let lastError;

    for (const model of MODELS) {
      try {
        const startedAt = Date.now();
        result = await callModel(model, prompt, apiKey);
        console.log(
          `Gemini model ${model.name} answered in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
        );
        break;
      } catch (error) {
        lastError = error;
        console.error(
          `Gemini model ${model.name} failed:`,
          error.response?.status || error.code || error.message
        );

        if (!shouldFallback(error)) {
          throw error;
        }
        console.log("Trying the next model...");
      }
    }

    if (!result) {
      throw lastError || new Error("All Gemini models failed");
    }

    const text = extractText(result.data);

    if (!text) {
      console.log("Gemini full response:", JSON.stringify(result.data, null, 2));
      throw new Error("Gemini returned no text. Check the full response above.");
    }

    console.log("Gemini generated text:", text);

    return text;
  } catch (error) {
    console.error("Gemini API STATUS:", error.response?.status);
    console.error(
      "Gemini API DATA:",
      JSON.stringify(error.response?.data ?? null, null, 2)
    );
    console.error("Gemini API MESSAGE:", error.message);

    throw error;
  }
};

export default geminiResponse;