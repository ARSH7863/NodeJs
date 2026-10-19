const express = require("express");
const userRouter = express.Router();

const { userAuth } = require("../middleware/auth");
const User = require("../models/user");
const ConnectionRequestModel = require("../models/connectionRequest");

const USER_SAFE_DATA = "firstName lastName photoURL age gender about skills isPremium membershipType isOnline lastSeen";

// Get all pending connection requests received by logged-in user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequestModel.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA);

    res.json({
      message: "Data Fetched Successfully!",
      data: connectionRequests.filter((r) => r.fromUserId),
    });
  } catch (err) {
    res.status(400).json({
      message: "Requests not found!",
      error: err.message,
    });
  }
});

const { onlineUsers } = require("../utils/socket.js");

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequestModel.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);

    const data = connectionRequests.filter((row) => row.fromUserId && row.toUserId).map((row) => {
      const userObj =
        row.fromUserId._id.toString() === loggedInUser._id.toString()
          ? row.toUserId.toObject()
          : row.fromUserId.toObject();

      // Override isOnline dynamically with real-time socket connection status
      const userIdStr = userObj._id.toString();
      userObj.isOnline = Boolean(onlineUsers.has(userIdStr) && onlineUsers.get(userIdStr).size > 0);

      return userObj;
    });

    res.json({ data });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

userRouter.get("/user/feed", userAuth, async (req, res) => {
  try {
    // User should see all the User Cards except
    // 0. His Own Card
    // 1. His Connections
    // 2. Ignored People
    // 3. Already Sent the Connection Request

    const loggedInUser = req.user;

    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;

    // Cursor-based pagination: lastId is the _id of the last user seen
    // This prevents users being skipped when the hideUsersFromFeed set
    // changes between page loads (e.g., due to a swipe happening mid-session)
    const lastId = req.query.lastId || null;

    // Find all connection requests (sent + received)
    const connectionRequests = await ConnectionRequestModel.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    const filter = {
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUser._id } },
        // Cursor: only fetch users created before the last seen user
        ...(lastId ? [{ _id: { $lt: lastId } }] : []),
      ],
    };

    const users = await User.find(filter)
      .select(USER_SAFE_DATA)
      .sort({ _id: -1 })
      .limit(limit);

    res.json({
      message: `Data Fetched Successfully!`,
      data: users,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = userRouter;
