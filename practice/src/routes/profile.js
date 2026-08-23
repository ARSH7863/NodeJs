const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const mongoose = require("mongoose");
const profileRouter = express.Router();
const User = require("../models/user.js");

const { userAuth } = require("../middleware/auth.js");
const { validateProfileEditData } = require("../utils/validation.js");

const USER_SAFE_DATA =
  "firstName lastName emailId photoURL age gender about skills";

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

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, profile updated successfully!`,
      data: loggedInUser,
    });
  } catch (err) {
    return res.status(400).send(`Error: ${err.message}`);
  }
});

profileRouter.delete("/profile/delete", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const deletedUser = await User.findByIdAndDelete(loggedInUser._id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    res.clearCookie("token");

    res.status(200).json({
      message: "Account deleted successfully!",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete account.",
      error: err.message,
    });
  }
});

profileRouter.get("/user", userAuth, async (req, res) => {
  try {
    const { emailId } = req.query;

    if (!emailId) {
      return res.status(400).json({
        message: "Email ID is required!",
      });
    }

    const user = await User.findOne({
      emailId: emailId.toLowerCase(),
    }).select(USER_SAFE_DATA);

    if (!user) {
      return res.status(404).json({
        message: "User Not Found!",
      });
    }

    res.status(200).json({
      message: "User fetched successfully!",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Something went wrong!",
      error: err.message,
    });
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
