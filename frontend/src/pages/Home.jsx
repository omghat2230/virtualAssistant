import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CiMenuFries } from "react-icons/ci";
import { RxCross2 } from "react-icons/rx";
import { UserDataContext } from "../context/UserContext";
import voiceImg from "../assets/voice.gif";
import voice1Img from "../assets/voice assistant.jpg";

// Lowercase and remove punctuation so "Jarvis." and "jarvis" match.
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Answer simple commands locally so they work even if the server is down.
const quickCommand = (command) => {
  const c = command.toLowerCase();
  const now = new Date();

  if (/\b(open|go to|start)\b.*\byou ?tube\b/.test(c)) {
    return { type: "youtube_open", response: "Opening YouTube." };
  }
  if (/\b(open|go to|start)\b.*\binstagram\b/.test(c)) {
    return { type: "instagram_open", response: "Opening Instagram." };
  }
  if (/\b(open|go to|start)\b.*\bfacebook\b/.test(c)) {
    return { type: "facebook_open", response: "Opening Facebook." };
  }
  if (/\b(open|start)\b.*\bcalculator\b/.test(c)) {
    return { type: "calculator_open", response: "Opening calculator." };
  }
  if (/\btime\b/.test(c) && !/\b(search|play|youtube|google)\b/.test(c)) {
    return {
      type: "get_time",
      response: `The current time is ${now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
    };
  }
  if (/\bdate\b/.test(c)) {
    return {
      type: "get_date",
      response: `Today's date is ${now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`,
    };
  }
  if (/\bday\b/.test(c) && /\b(today|what)\b/.test(c)) {
    return {
      type: "get_day",
      response: `Today is ${now.toLocaleDateString("en-IN", { weekday: "long" })}.`,
    };
  }
  return null;
};

const Home = () => {
  const navigate = useNavigate();

  const { UserData, serverUrl, setUserData } =
    useContext(UserDataContext);

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");

  // Mobile menu open / closed.
  const [menuOpen, setMenuOpen] = useState(false);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const awakeUntilRef = useRef(0);

  const synth = window.speechSynthesis;

  // Support both the existing database spelling and the corrected spelling.
  const assistantImage =
    UserData?.assistantImage || UserData?.assistanImage || "";

  const assistantName = (UserData?.assistantName || "Assistant").trim();

  // Keep the latest values in refs because the recognition handlers
  // are created only once.
  const assistantNameRef = useRef(assistantName);
  const serverUrlRef = useRef(serverUrl);

  assistantNameRef.current = assistantName;
  serverUrlRef.current = serverUrl;

  // Speak the assistant's answer.
  const speak = (text) => {
    return new Promise((resolve) => {
      if (!text || !text.trim()) {
        resolve();
        return;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Prefer LOCAL voices: Chrome's online voices can stall
      // and may never fire onend.
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.lang === "en-IN" && v.localService) ||
        voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang && v.lang.startsWith("en") && v.localService) ||
        voices.find((v) => v.lang && v.lang.startsWith("en"));
      if (voice) {
        utterance.voice = voice;
      }

      isSpeakingRef.current = true;
      setListening(false);

      // Stop the microphone while speaking so the assistant
      // does not hear itself.
      try {
        if (recognitionRef.current && isRecognizingRef.current) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        // ignore
      }

      let done = false;
      let safety;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        isSpeakingRef.current = false;
        resolve();
        // Resume listening after speaking.
        window.setTimeout(() => startRecognition(), 500);
      };

      // Safety timeout so a voice that never fires onend
      // cannot block the assistant forever.
      safety = window.setTimeout(
        finish,
        Math.max(4000, text.length * 90 + 3000)
      );

      utterance.onend = finish;

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        finish();
      };

      // Chrome can drop speech when speak() is called right after cancel().
      window.setTimeout(() => {
        synth.speak(utterance);
      }, 100);
    });
  };

  // Send the recognized command to the backend.
  const getAssistantResponse = async (command) => {
    const result = await axios.post(
      `${serverUrlRef.current}/api/user/asktoassistant`,
      { command },
      { withCredentials: true, timeout: 15000 }
    );

    return result.data;
  };

  // Handle the backend answer.
  const handleCommand = async (command) => {
    try {
      console.log("User command:", command);

      const startedAt = performance.now();
      // Simple commands are answered locally; everything else goes to the server.
      const data = quickCommand(command) || (await getAssistantResponse(command));
      console.log(
        `Answer ready in ${((performance.now() - startedAt) / 1000).toFixed(1)}s`
      );

      console.log("Response:", data);

      const answer =
        typeof data?.response === "string" ? data.response.trim() : "";

      if (!answer) {
        const fallback = "Sorry, I could not get an answer. Please try again.";
        setAiText(fallback);
        await speak(fallback);
        return;
      }

      // Show the answer below the question.
      setAiText(answer);
      // Speak the same answer that appears on the screen.
      await speak(answer);

      switch (data.type) {
        case "google_search":
          if (command.trim()) {
            window.open(
              `https://www.google.com/search?q=${encodeURIComponent(command)}`,
              "_blank",
              "noopener,noreferrer"
            );
          }
          break;

        case "youtub_search":
          if (command.trim()) {
            window.open(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(command)}`,
              "_blank",
              "noopener,noreferrer"
            );
          }
          break;

        case "youtub_play":
          if (command.trim()) {
            window.open(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(command)}`,
              "_blank",
              "noopener,noreferrer"
            );
          }
          break;

        case "youtube_open":
          window.open("https://www.youtube.com/", "_blank");
          break;

        case "calculator_open":
          window.open("https://www.google.com/search?q=calculator", "_blank");
          break;

        case "instagram_open":
          window.open("https://www.instagram.com/", "_blank");
          break;

        case "facebook_open":
          window.open("https://www.facebook.com/", "_blank");
          break;

        default:
          break;
      }
    } catch (error) {
      console.error(
        "Assistant response error:",
        error.response?.data || error.message
      );

      const message =
        error.response?.data?.response ||
        "Sorry, I could not connect to the assistant. Please try again.";

      setAiText(message);
      await speak(message);
    }
  };

  // Start speech recognition.
  const startRecognition = () => {
    if (
      !recognitionRef.current ||
      isRecognizingRef.current ||
      isSpeakingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Could not start speech recognition:", error);
      }
    }
  };

  // Set up speech recognition once.
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        "Speech recognition is not supported in this browser. Try Chrome."
      );
      return;
    }

    // Load voices early (Chrome loads them asynchronously).
    synth.getVoices();

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);

      if (!isSpeakingRef.current && !isProcessingRef.current) {
        window.setTimeout(() => {
          if (!isSpeakingRef.current && !isProcessingRef.current) {
            startRecognition();
          }
        }, 500);
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are normal; onend restarts listening.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
      isRecognizingRef.current = false;
      setListening(false);
    };

    recognition.onresult = async (event) => {
      // Read only the latest final result.
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult.isFinal) return;
      const transcript = lastResult[0].transcript.trim();

      if (!transcript || isProcessingRef.current || isSpeakingRef.current) {
        return;
      }

      setUserText(transcript);

      const wakeWord = normalize(assistantNameRef.current);
      const cleanTranscript = normalize(transcript);
      const wakeWordIndex = cleanTranscript.indexOf(wakeWord);

      // If the wake word was heard a moment ago, accept the
      // command even when it arrives in a separate result.
      const isAwake = Date.now() < awakeUntilRef.current;

      if (wakeWordIndex === -1 && !isAwake) {
        console.log(`Wake word "${wakeWord}" not found in: "${transcript}"`);
        return;
      }

      let command;

      if (wakeWordIndex === -1) {
        // No name in this result, but we are awake: whole text is the command.
        command = cleanTranscript;
      } else {
        // Remove the assistant's name to get the actual command.
        command = (
          cleanTranscript.slice(0, wakeWordIndex) +
          " " +
          cleanTranscript.slice(wakeWordIndex + wakeWord.length)
        )
          .replace(/\s+/g, " ")
          .trim();
      }

      // Collapse accidental repeats like "open open youtube".
      command = command.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");

      // Only the name was said: stay awake and wait for the command.
      if (!command) {
        awakeUntilRef.current = Date.now() + 15000;
        const message = "Yes, how can I help you?";
        setAiText(message);
        await speak(message);
        // Start the 10 second window after the reply finishes speaking.
        awakeUntilRef.current = Date.now() + 10000;
        return;
      }

      // Command received, so go back to sleep until the name is said again.
      awakeUntilRef.current = 0;
      isProcessingRef.current = true;

      try {
        await handleCommand(command);
      } finally {
        isProcessingRef.current = false;

        if (!isSpeakingRef.current) {
          window.setTimeout(startRecognition, 500);
        }
      }
    };

    startRecognition();

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;

      recognition.stop();
      recognitionRef.current = null;

      synth.cancel();

      isRecognizingRef.current = false;
      isSpeakingRef.current = false;
      isProcessingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Logout.
  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });

      synth.cancel();
      setUserData(null);
      setMenuOpen(false);
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  const handleCustomize = () => {
    setMenuOpen(false);
    navigate("/customize");
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col items-center justify-center gap-5 p-4">
      {/* ---------- Large screens: buttons at top right, one below the other ---------- */}
      <div className="hidden lg:flex flex-col gap-3 absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={handleLogOut}
          className="w-52 px-4 py-2 rounded-full bg-white text-black font-medium cursor-pointer"
        >
          Log Out
        </button>

        <button
          type="button"
          onClick={handleCustomize}
          className="w-52 px-4 py-2 rounded-full bg-white text-black font-medium cursor-pointer"
        >
          Customize Assistant
        </button>
      </div>

      {/* ---------- Small screens: menu icon ---------- */}
      <CiMenuFries
        onClick={() => setMenuOpen(true)}
        className="lg:hidden text-white absolute top-5 right-5 w-8 h-8 cursor-pointer z-20"
      />

      {/* ---------- Small screens: opened menu with cross button ---------- */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#00000053] backdrop-blur-lg p-5 flex flex-col items-start gap-3">
          <RxCross2
            onClick={() => setMenuOpen(false)}
            className="text-white absolute top-5 right-5 w-8 h-8 cursor-pointer"
          />

          <div className="flex flex-col gap-3 mt-14 w-full">
            <button
              type="button"
              onClick={handleLogOut}
              className="w-full px-4 py-3 rounded-full bg-white text-black font-medium cursor-pointer"
            >
              Log Out
            </button>

            <button
              type="button"
              onClick={handleCustomize}
              className="w-full px-4 py-3 rounded-full bg-white text-black font-medium cursor-pointer"
            >
              Customize Assistant
            </button>
          </div>
        </div>
      )}

      {/* ---------- Assistant ---------- */}
      <div className="w-[300px] h-[400px] flex items-center justify-center overflow-hidden rounded-2xl">
        {assistantImage ? (
          <img
            src={assistantImage}
            alt="Assistant"
            className="w-full h-full object-cover rounded-2xl"
            onError={(event) => {
              console.error("Assistant image failed to load:", assistantImage);
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <img
            src={voice1Img}
            alt="Default assistant"
            className="w-full h-full object-cover rounded-2xl"
          />
        )}
      </div>

      <h1 className="text-white text-2xl font-semibold">
        {assistantName}
      </h1>

      {listening && (
        <img
          src={voiceImg}
          alt="Listening"
          className="w-24 h-16 object-contain"
        />
      )}

      <h1 className="text-white text-center text-lg px-4 max-w-2xl">
        {userText && (
          <div className="mb-3">
            <span className="font-semibold">You:</span> {userText}
          </div>
        )}

        {aiText && (
          <div className="whitespace-pre-wrap">
            <span className="font-semibold">Assistant:</span> {aiText}
          </div>
        )}
      </h1>
    </div>
  );
};

export default Home;
