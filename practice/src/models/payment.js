const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentId: {
      type: String,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["created", "success", "failed", "pending"],
      default: "created",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    receipt: {
      type: String,
      required: true,
    },
    notes: {
      type: Object,
    },
    signature: {
      type: String,
    },
  },
  { timestamps: true },
);

const PaymentModel = mongoose.model("Payment", paymentSchema);

module.exports = PaymentModel;
