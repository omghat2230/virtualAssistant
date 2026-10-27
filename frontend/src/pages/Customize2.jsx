import React, { useContext, useEffect, useState } from "react";
import { UserDataContext } from "../context/UserContext";
import { IoMdArrowBack } from "react-icons/io";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Customize2 = () => {
  const { UserData, backendImage, selectedImage, serverUrl, setUserData } =
    useContext(UserDataContext);

  // FIX: use the real field name and no leading space.
  const [assistantName, setAssistantName] = useState(
    (UserData?.assistantName || "").trim()
  );

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If the page was refreshed, the chosen image is lost: go back and choose again.
  useEffect(() => {
    if (!backendImage && !selectedImage) {
      navigate("/customize", { replace: true });
    }
  }, [backendImage, selectedImage, navigate]);

  const handleUpdateAssistant = async () => {
    const name = assistantName.trim();

    if (!name) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("assistantName", name);

      if (backendImage) {
        formData.append("AssistantImage", backendImage);
      } else {
        formData.append("imageUrl", selectedImage);
      }

      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        { withCredentials: true }
      );

      console.log(result.data);

      // Save the updated user first, then go to the home page.
      setUserData(result.data);
      navigate("/home");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-linear-to-t from-[black] to-[#020236] flex justify-center items-center flex-col p-5 relative">
      <IoMdArrowBack
        className="absolute top-8 left-8 text-white text-2xl cursor-pointer"
        onClick={() => navigate("/customize")}
      />

      <h1 className="text-gray-500 text-2xl mt-1 font-semibold mb-5">
        Enter Your <span className="text-blue-300">Assistant Name</span>
      </h1>

      <input
        value={assistantName}
        required
        onChange={(e) => setAssistantName(e.target.value)}
        type="text"
        placeholder="ex: jarvis"
        className="w-full max-w-100 h-12 outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-3 py-1 rounded-full text-[18px]"
      />

      {assistantName.trim() && (
        <button
          className="min-w-55 h-10 bg-white rounded-full px-3 py-1 text-gray-800 font-sans text-[19px] mt-4 cursor-pointer"
          disabled={loading}
          onClick={handleUpdateAssistant}
        >
          {!loading ? "Create Your Assistant" : "loading..."}
        </button>
      )}
    </div>
  );
};

export default Customize2;
