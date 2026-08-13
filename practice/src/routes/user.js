const express = require("express");
const userRouter = express.Router();

const { userAuth } = require("../middleware/auth");
const ConnectionRequestModel = require("../models/connectionRequest");

// Get all pending connection requests received by logged-in user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequestModel.find({
      toUserId: loggedInUser._id,
      status: "interested",
    });

    res.json({
      message: "Data Fetched Successfully!",
      data: connectionRequests,
    });
  } catch (err) {
    res.status(400).json({
      message: "Requests not found!",
      error: err.message,
    });
  }
});

module.exports = userRouter;
