import React, { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Customize from "./pages/Customize";
import Customize2 from "./pages/Customize2";
import Home from "./pages/Home";

import { UserDataContext } from "./context/UserContext";

const App = () => {
  const { UserData } = useContext(UserDataContext);

  // Accept both the old (misspelled) and the corrected field name.
  const hasAssistant =
    Boolean(UserData?.assistantName) &&
    Boolean(UserData?.assistantImage || UserData?.assistanImage);

  return (
    <Routes>
      {/* "/" just sends the user to the right place */}
      <Route
        path="/"
        element={
          !UserData ? (
            <Navigate to="/signin" replace />
          ) : (
            <Navigate to="/home" replace />
          )
        }
      />

      {/* Home: only when logged in AND the assistant is created */}
      <Route
        path="/home"
        element={
          !UserData ? (
            <Navigate to="/signin" replace />
          ) : hasAssistant ? (
            <Home />
          ) : (
            <Navigate to="/customize" replace />
          )
        }
      />

      <Route
        path="/signup"
        element={!UserData ? <SignUp /> : <Navigate to="/home" replace />}
      />

      <Route
        path="/signin"
        element={!UserData ? <SignIn /> : <Navigate to="/home" replace />}
      />

      <Route
        path="/customize"
        element={UserData ? <Customize /> : <Navigate to="/signup" replace />}
      />

      <Route
        path="/customize2"
        element={UserData ? <Customize2 /> : <Navigate to="/signup" replace />}
      />

      {/* Any unknown URL goes back to "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
