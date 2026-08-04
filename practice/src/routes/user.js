const express = require('express');
const userRouter = express.Router();
const {userAuth} = require('../middleware/auth');
const ConnectionRequestModel = require('../models/connectionRequest');

userRouter.get('/user/requests/received', userAuth, async(req,res) => {
  try{
    const loggedInUser = req.user; 

    const connectionRequest = await ConnectionRequestModel.find({
      toUserId: loggedInUser._id,
      // status: ""
    });
    req.json({
      message: "Data Fetched Successfully!",
      data: connectionRequest,
    })
  }
  catch(err){
    req.statusCode(400).json({
      message: `Requests not Found!`
    })
  }
})

module.exports = userRouter;