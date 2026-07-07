const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middleware/auth.js");

requestRouter.post("/sendConnectionRequest", userAuth, async (req, res) => {
  const user = req.user;
  // Sending a connection request
  console.log(`Sending a connection request`);

  res.send(`${user.firstName} has sent a connection request`);
});

module.exports = requestRouter;
