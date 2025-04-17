"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineMail } from "react-icons/hi";
import { RiLockPasswordLine } from "react-icons/ri";
import "./LoginSignup.css";

const LoginSignup = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await response.json();
      console.log("API Response:", data); // Kiểm tra phản hồi từ API

      if (!response.ok) throw new Error(data.message);

      // Lưu token vào localStorage và chuyển hướng
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  return (
    <div className="login-container">
      <div className="container">
        <div className="header">
          <div className="text">Login</div>
          <div className="underline"></div>
        </div>
        <div className="inputs">
          <div className="input">
            <HiOutlineMail className="mail-icons icons" />
            <input
              type="text"
              placeholder="Account Name"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="input">
            <RiLockPasswordLine className="pass-icons icons" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="submit-container">
          <button className="submit" onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
