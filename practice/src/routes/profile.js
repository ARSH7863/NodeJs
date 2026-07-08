const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
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
    return res.status(400).send(`Error: ${err.message}`);
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

profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).send(`Both Passwords are required!`);
    }

    const loggedInUser = req.user;

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      loggedInUser.password,
    );

    if (!isPasswordValid) {
      return res.status(400).send(`Old password is incorrect`);
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      loggedInUser.password,
    );

    if (isSamePassword) {
      return res
        .status(400)
        .send("New password cannot be the same as the old password.");
    }

    if (!validator.isStrongPassword(newPassword)) {
      return res
        .status(400)
        .send(
          "Password must contain uppercase, lowercase, number and special character.",
        );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    loggedInUser.password = passwordHash;
    await loggedInUser.save();

    res.clearCookie("token");

    res.status(200).json({
      message: "Password updated successfully. Please login again.",
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

module.exports = profileRouter;
