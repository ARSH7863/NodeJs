const express = require("express");
const authRouter = express.Router();
const axios = require("axios");

const { validateSignUpData } = require("../utils/validation.js");
const User = require("../models/user.js");
const bcrypt = require("bcrypt");

// =========================
// SIGNUP
// =========================

authRouter.post("/signup", async (req, res) => {
  try {
    // Validate signup data
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;

    // Encrypt password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    await user.save();

    res.send("User added successfully");
  } catch (err) {
    res.status(400).send(`Error saving the user: ${err.message}`);
  }
});

// =========================
// LOGIN
// =========================

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ emailId });

    if (!user) {
      return res.status(400).send("Invalid credentials");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return res.status(400).send("Invalid credentials");
    }

    const token = await user.getJWT();

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login Successful!",
      user: user,
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// =========================
// LOGOUT
// =========================

authRouter.post("/logout", async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    expires: new Date(0),
  });

  res.send("You have been logged out successfully!");
});

// ── 1. GitHub OAuth Initiation ──────────────────────────────────────────────
authRouter.get("/auth/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;
  res.redirect(redirectUri);
});
// ── 2. GitHub OAuth Callback ────────────────────────────────────────────────
authRouter.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  const isLocalhost =
    req.get("host")?.includes("localhost") ||
    req.get("host")?.includes("127.0.0.1");
  const clientUrl = isLocalhost
    ? "http://localhost:5173"
    : process.env.CLIENT_URL || "http://13.61.17.142";

  if (!code) {
    return res.redirect(`${clientUrl}/login?error=OAuthFailed`);
  }
  try {
    // 1. Exchange temporary code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }
    // 2. Fetch user profile from GitHub
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ghUser = userRes.data;
    // 3. Fetch primary verified email if private
    let email = ghUser.email;
    if (!email) {
      const emailRes = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const primaryEmail = emailRes.data.find((e) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : emailRes.data[0]?.email;
    }
    if (!email) {
      return res.redirect(`${clientUrl}/login?error=NoEmail`);
    }
    // 4. Find existing user or create a new user
    const [firstName, ...rest] = (ghUser.name || ghUser.login || "Dev").split(
      " ",
    );
    let user = await User.findOne({
      $or: [{ emailId: email }, { githubId: String(ghUser.id) }],
    });
    if (!user) {
      user = new User({
        firstName,
        lastName: rest.join(" ") || "",
        emailId: email,
        githubId: String(ghUser.id),
        photoURL: ghUser.avatar_url,
        about: ghUser.bio || "Full-stack Developer",
      });
      await user.save();
    } else if (!user.githubId) {
      user.githubId = String(ghUser.id);
      if (!user.photoURL) user.photoURL = ghUser.avatar_url;
      await user.save();
    }
    // 5. Generate JWT token
    const token = await user.getJWT();
    // 6. Set HTTP-only Cookie
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
      secure: false, // Set to true if you add SSL (https) later
      sameSite: "lax",
    });
    // 7. Redirect to frontend (user is now logged in!)
    res.redirect(`${clientUrl}/`);
  } catch (err) {
    console.error("GitHub Auth Error:", err);
    res.redirect(`${clientUrl}/login?error=OAuthFailed`);
  }
});

module.exports = authRouter;
