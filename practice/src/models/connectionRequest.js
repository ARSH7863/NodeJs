const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to User Collection
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  { timestamps: true },
);

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

connectionRequestSchema.pre("save", async function () {
  if (this.fromUserId.equals(this.toUserId)) {
    console.log(typeof next);
    throw new Error("Cannot send connection request to yourself!");
  }
});

const ConnectionRequestModel = new mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema,
);

module.exports = ConnectionRequestModel;
