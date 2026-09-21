const express = require("express");
const authRouter = express.Router();
const axios = require("axios");

const { validateSignUpData } = require("../utils/validation.js");
const User = require("../models/user.js");
const bcrypt = require("bcrypt");

const getCookieOptions = (req) => {
  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https" ||
    (process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith("https://"));
  return {
    httpOnly: true,
    secure: Boolean(isHttps),
    sameSite: isHttps ? "none" : "lax",
  };
};

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
      ...getCookieOptions(req),
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
    ...getCookieOptions(req),
    expires: new Date(0),
  });

  res.send("You have been logged out successfully!");
});

// ── 1. GitHub OAuth Initiation ──────────────────────────────────────────────
authRouter.get("/auth/github", (req, res) => {
  const isLocalhost =
    req.get("host")?.includes("localhost") ||
    req.get("host")?.includes("127.0.0.1");

  const callbackUrl = isLocalhost
    ? "http://localhost:7777/auth/github/callback"
    : (process.env.GITHUB_CALLBACK_URL || "https://devtinder7863.netlify.app/api/auth/github/callback");

  const clientId = process.env.GITHUB_CLIENT_ID;
  let from = req.query.from || "";
  if (!from && req.headers.referer) {
    try {
      from = new URL(req.headers.referer).origin;
    } catch (_) {}
  }
  const stateParam = from ? `&state=${encodeURIComponent(from)}` : "";
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email${stateParam}`;
  res.redirect(authUrl);
});
// ── 2. GitHub OAuth Callback ────────────────────────────────────────────────
authRouter.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const isLocalhost =
    req.get("host")?.includes("localhost") ||
    req.get("host")?.includes("127.0.0.1");

  const callbackUrl = isLocalhost
    ? "http://localhost:7777/auth/github/callback"
    : (process.env.GITHUB_CALLBACK_URL || "https://devtinder7863.netlify.app/api/auth/github/callback");

  let clientUrl = isLocalhost
    ? "http://localhost:5173"
    : process.env.CLIENT_URL || "https://devtinder7863.netlify.app";

  if (state && typeof state === "string" && (state.startsWith("http://") || state.startsWith("https://"))) {
    clientUrl = state;
  }

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
        redirect_uri: callbackUrl,
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
      ...getCookieOptions(req),
      expires: new Date(Date.now() + 8 * 3600000),
    });
    // 7. Redirect to frontend (user is now logged in!)
    res.redirect(`${clientUrl}/`);
  } catch (err) {
    console.error("GitHub Auth Error:", err);
    res.redirect(`${clientUrl}/login?error=OAuthFailed`);
  }
});

// ── 3. Google OAuth Initiation ───────────────────────────────────────────────
authRouter.get("/auth/google", (req, res) => {
  const isLocalhost =
    req.get("host")?.includes("localhost") ||
    req.get("host")?.includes("127.0.0.1");

  const callbackUrl = isLocalhost
    ? "http://localhost:7777/auth/google/callback"
    : (process.env.GOOGLE_CALLBACK_URL || "https://devtinder7863.netlify.app/api/auth/google/callback");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(callbackUrl);
  const scope = encodeURIComponent("openid email profile");

  let from = req.query.from || "";
  if (!from && req.headers.referer) {
    try {
      from = new URL(req.headers.referer).origin;
    } catch (_) {}
  }
  const stateParam = from ? `&state=${encodeURIComponent(from)}` : "";

  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=select_account` +
    stateParam;

  res.redirect(googleAuthUrl);
});


// ── 4. Google OAuth Callback ─────────────────────────────────────────────────
authRouter.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  const isLocalhost =
    req.get("host")?.includes("localhost") ||
    req.get("host")?.includes("127.0.0.1");

  const callbackUrl = isLocalhost
    ? "http://localhost:7777/auth/google/callback"
    : (process.env.GOOGLE_CALLBACK_URL || "https://devtinder7863.netlify.app/api/auth/google/callback");

  let clientUrl = isLocalhost
    ? "http://localhost:5173"
    : process.env.CLIENT_URL || "https://devtinder7863.netlify.app";

  if (state && typeof state === "string" && (state.startsWith("http://") || state.startsWith("https://"))) {
    clientUrl = state;
  }

  if (!code) {
    return res.redirect(`${clientUrl}/login?error=OAuthFailed`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const { access_token, id_token } = tokenResponse.data;
    if (!access_token) {
      throw new Error("Failed to obtain access token from Google");
    }

    // 2. Fetch Google user profile
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const gUser = userRes.data;
    // gUser: { sub, email, email_verified, name, given_name, family_name, picture }

    if (!gUser.email || !gUser.email_verified) {
      return res.redirect(`${clientUrl}/login?error=NoEmail`);
    }

    // 3. Find existing user or create a new one
    let user = await User.findOne({
      $or: [{ emailId: gUser.email }, { googleId: gUser.sub }],
    });

    if (!user) {
      user = new User({
        firstName: gUser.given_name || gUser.name?.split(" ")[0] || "User",
        lastName: gUser.family_name || "",
        emailId: gUser.email,
        googleId: gUser.sub,
        photoURL: gUser.picture,
        about: "Google Sign-In User",
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google to existing account
      user.googleId = gUser.sub;
      if (!user.photoURL || user.photoURL.includes("istockphoto")) {
        user.photoURL = gUser.picture;
      }
      await user.save();
    }

    // 4. Generate JWT & set cookie
    const token = await user.getJWT();
    res.cookie("token", token, {
      ...getCookieOptions(req),
      expires: new Date(Date.now() + 8 * 3600000),
    });

    // 5. Redirect to frontend
    res.redirect(`${clientUrl}/`);
  } catch (err) {
    console.error("Google Auth Error:", err.response?.data || err.message);
    res.redirect(`${clientUrl}/login?error=OAuthFailed`);
  }
});

module.exports = authRouter;

