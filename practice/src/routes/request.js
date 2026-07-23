const express = require("express");
const requestRouter = express.Router();

const { userAuth } = require("../middleware/auth.js");
const User = require("../models/user.js");
const ConnectionRequest = require("../models/connectionRequest.js");

requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;

      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          message: `Invalid Status Type: ${status}`,
        });
      }

      // If there is an existing ConnectionRequest
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingConnectionRequest) {
        return res
          .status(409)
          .json({ message: "Connection request already exists!" });
      }

      if (fromUserId.equals(toUserId)) {
        return res.status(400).json({
          message: "You cannot send a connection request to yourself!",
        });
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const toUser = await User.findById(toUserId);

      if (!toUser) {
        return res.status(400).json({ message: "User Not Found!" });
      }

      const data = await connectionRequest.save();

      res.json({
        message: "Connection request sent successfully!",
        data,
      });
    } catch (err) {
      res.status(400).send(`Error: ${err.message}`);
    }
  },
);

module.exports = requestRouter;
