import User from "../models/userModel.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import moment from "moment";

// Get current logged-in user
export const getCurruntUser = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userData = user.toObject();

    // Support both spellings while preserving your existing database field.
    userData.assistantImage =
      userData.assistantImage || userData.assistanImage || "";

    return res.status(200).json(userData);
  } catch (error) {
    console.error("GET CURRENT USER ERROR:", error.message);

    return res.status(500).json({
      message: "Could not get current user",
      error: error.message,
    });
  }
};

// Update assistant name and image
export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;

    let assistantImage;

    if (req.file) {
      assistantImage = await uploadOnCloudinary(req.file.path);
    } else {
      assistantImage = imageUrl;
    }

    if (!assistantName) {
      return res.status(400).json({
        message: "Assistant name is required",
      });
    }

    // Keep the existing misspelled database field for compatibility.
    const updateData = {
      assistantName,
      assistanImage: assistantImage,
    };

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userData = user.toObject();

    // Return both names so the frontend can display the image.
    userData.assistantImage =
      userData.assistantImage || userData.assistanImage || "";

    return res.status(200).json(userData);
  } catch (error) {
    console.error("UPDATE ASSISTANT ERROR:", error.message);

    return res.status(500).json({
      message: "Update assistant failed",
      error: error.message,
    });
  }
};

// Process user's command and return the assistant's answer
export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== "string" || !command.trim()) {
      return res.status(400).json({
        type: "error",
        userInput: "",
        response: "Please tell me what you want me to do.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        type: "error",
        userInput: command,
        response: "User not found. Please sign in again.",
      });
    }

    const userName = user.name || "User";
    const assistantName = user.assistantName || "Assistant";

    // Save the command to history.
    if (!Array.isArray(user.history)) {
      user.history = [];
    }

    user.history.push(command.trim());
    await user.save();

    const result = await geminiResponse(
      command.trim(),
      assistantName,
      userName
    );

    console.log("Gemini raw result:", result);

    if (!result || typeof result !== "string") {
      return res.status(502).json({
        type: "error",
        userInput: command,
        response: "I could not generate an answer. Please try again.",
      });
    }

    // Remove optional Markdown code fences from Gemini's response.
    const cleanedResult = result
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Find the JSON object returned by Gemini.
    const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Still return usable text instead of leaving the frontend without an answer.
      return res.status(200).json({
        type: "general",
        userInput: command,
        response: cleanedResult,
      });
    }

    let gemResult;

    try {
      gemResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("GEMINI JSON PARSE ERROR:", parseError.message);

      return res.status(200).json({
        type: "general",
        userInput: command,
        response: cleanedResult,
      });
    }

    const type = gemResult.type || "general";
    const userInput = gemResult.userInput || command;

    console.log("Gemini parsed type:", type);

    // Handle date and time commands on the backend.
    switch (type) {
      case "get_date":
        return res.status(200).json({
          type,
          userInput,
          response: `The current date is ${moment().format("YYYY-MM-DD")}.`,
        });

      case "get_time":
        return res.status(200).json({
          type,
          userInput,
          response: `The current time is ${moment().format("hh:mm A")}.`,
        });

      case "get_day":
        return res.status(200).json({
          type,
          userInput,
          response: `Today is ${moment().format("dddd")}.`,
        });

      case "get_month":
        return res.status(200).json({
          type,
          userInput,
          response: `The current month is ${moment().format("MMMM")}.`,
        });

      // Return the answer for commands handled by the frontend.
      case "google_search":
      case "youtub_search":
      case "youtub_play":
      case "general":
      case "calculator_open":
      case "instagram_open":
      case "facebook_open":
      case "weather_show":
        return res.status(200).json({
          type,
          userInput,
          response:
            typeof gemResult.response === "string" &&
            gemResult.response.trim()
              ? gemResult.response
              : "I could not generate a response. Please try again.",
        });

      default:
        // Preserve any usable answer even if Gemini returns a new command type.
        if (
          typeof gemResult.response === "string" &&
          gemResult.response.trim()
        ) {
          return res.status(200).json({
            type,
            userInput,
            response: gemResult.response,
          });
        }

        return res.status(200).json({
          type: "general",
          userInput,
          response: "I did not understand that command. Please try again.",
        });
    }
  } catch (error) {
    console.error(
      "ASSISTANT ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      type: "error",
      message: "Assistant error",
      response: "Sorry, I could not process your request. Please try again.",
      error: error.message,
      geminiStatus: error.response?.status || null,
      geminiData: error.response?.data || null,
    });
  }
};