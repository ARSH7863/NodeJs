const express = require("express");
const profileRouter = express.Router();
const User = require("../models/user.js");
const { userAuth } = require("../middleware/auth.js");

profileRouter.get("/profile", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

profileRouter.get("/feed", async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (err) {
    res.status(400).send("Users not found!");
  }
});

module.exports = profileRouter;
