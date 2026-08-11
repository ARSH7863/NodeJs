const express = require("express");
const userRouter = express.Router();

const { userAuth } = require("../middleware/auth");
const ConnectionRequestModel = require("../models/connectionRequest");

// Get all the pending connection request for the loggedIn User
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequest = await ConnectionRequestModel.find({
      toUserId: loggedInUser._id,
      status: "interested",
    });

    res.json({
      message: "Data Fetched Successfully!",
      data: connectionRequest,
    });
  } catch (err) {
    req.statusCode(400).send("Error: " + err.message);
  }
});

module.exports = userRouter;
