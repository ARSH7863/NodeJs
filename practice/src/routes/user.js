const express = require("express");
const User = require("../models/user");

const userRouter = express.Router();

userRouter.get("/user", async (req, res) => {
  try {
    const { emailId } = req.query;

    const user = await User.findOne({ emailId });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.send(user);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

userRouter.patch("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const data = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    });

    res.send(user);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

userRouter.delete("/delete/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndDelete(userId);
    res.send(`User Deleted successfully!`);
  } catch (err) {
    res.status(400).send(`User Not Found`);
  }
});

module.exports = userRouter;
