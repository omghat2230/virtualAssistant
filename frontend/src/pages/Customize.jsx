import React, { useContext, useRef } from "react";
import Card from "../components/Card";
import image1 from "../assets/image1.jpg";
import image2 from "../assets/image2.jpg";
import { IoMdArrowBack } from "react-icons/io";
import { CiImageOn } from "react-icons/ci";
import { UserDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const Customize = () => {
  const {
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
  } = useContext(UserDataContext);

  const inputImage = useRef();
  const navigate = useNavigate();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  return (
    <div className="w-full h-screen bg-linear-to-t from-[black] to-[#020236] flex justify-center items-center flex-col">
      <IoMdArrowBack
        className="absolute top-8 left-8 text-white text-2xl cursor-pointer"
        onClick={() => navigate("/home")}
      />

      <h1 className="text-gray-500 text-2xl mt-1 font-semibold">
        Select your Assistant
      </h1>

      <div className="w-90% max-w-60% flex justify-center items-center flex-wrap gap-3">
        <Card image={image1} />
        <Card image={image2} />

        <div
          className={`w-25 h-35 lg:w-40 lg:h-60 bg-[#030326] border-2 border-[#020118] rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-600 flex items-center justify-center cursor-pointer ${
            selectedImage === "input"
              ? "border-4 border-white shadow-2xl shadow-blue-950"
              : ""
          }`}
          onClick={() => {
            inputImage.current.click();
            setSelectedImage("input");
          }}
        >
          {!frontendImage && <CiImageOn className="text-white w-7 h-7" />}
          {frontendImage && (
            <img src={frontendImage} className="h-full object-cover" />
          )}
        </div>

        <input
          onChange={handleImage}
          type="file"
          accept="image/*"
          ref={inputImage}
          hidden
        />
      </div>

      {selectedImage && (
        <button
          className="min-w-55 h-10 bg-white rounded-full px-3 py-1 text-gray-800 font-sans text-[19px] mt-4 cursor-pointer"
          onClick={() => navigate("/customize2")}
        >
          Next
        </button>
      )}
    </div>
  );
};

export default Customize;
