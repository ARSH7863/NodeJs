const express = require("express");
const profileRouter = express.Router();
const User = require("../models/user.js");

const { userAuth } = require("../middleware/auth.js");
const { validateProfileEditData } = require("../utils/validation.js");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateProfileEditData(req)) {
      throw new Error(`Invalid Edit Requests`);
    }
    const loggedInUser = req.user;
    console.log(loggedInUser);

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    console.log(loggedInUser);
    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, profile updated successfully!`,
      data: loggedInUser,
    });
  } catch (err) {
    return res.send(400).send(`Error: ${err.message}`);
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
