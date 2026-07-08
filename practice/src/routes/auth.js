const express = require("express");
const authRouter = express.Router();
const { validateSignUpData } = require("../utils/validation.js");
const User = require("../models/user.js");
const bcrypt = require("bcrypt");

authRouter.post("/signup", async (req, res) => {
  // Validation of Data
  validateSignUpData(req);

  const { firstName, lastName, emailId, password } = req.body;

  // Encrypt the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create a new instance of the User model

  try {
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    await user.save();
    res.send(`User added successfully`);
  } catch (err) {
    res.status(400).send(`Error saving the user: ${err.message}`);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error(`Invalid credentials`);
    }

    const isPasswordValid = await user.validatePassword(password);
    if (isPasswordValid) {
      const token = await user.getJWT();

      res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 8 * 3600000),
      });

      res.send(`Login Successful!`);
    } else {
      return res.status(400).send(`Invalid credentials`);
    }
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

authRouter.post("/logout", async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
  });
  res.send(`You have been logged out successfully!`);
});

module.exports = authRouter;
