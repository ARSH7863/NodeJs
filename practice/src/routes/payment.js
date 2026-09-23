const express = require("express");
const paymentRouter = express.Router();
const { validatePaymentVerification, validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");

const { userAuth } = require("../middleware/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const User = require("../models/user");
const { MEMBERSHIP_AMOUNT } = require("../utils/constants");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { membershipType } = req.body || {};
    const normalizedType = membershipType?.toString().trim().toLowerCase();
    const user = req.user;

    if (!normalizedType || !MEMBERSHIP_AMOUNT[normalizedType]) {
      return res.status(400).json({
        error: "Invalid membership type. Allowed types: 'silver', 'gold'",
      });
    }

    const currentPlan = user.isPremium && user.membershipType ? user.membershipType.toLowerCase() : "free";

    if (currentPlan === normalizedType) {
      return res.status(400).json({
        error: `You already have an active ${normalizedType} membership.`,
      });
    }

    const tierHierarchy = { free: 0, silver: 1, gold: 2 };

    if (tierHierarchy[normalizedType] < tierHierarchy[currentPlan]) {
      return res.status(400).json({
        error: `Downgrade to ${normalizedType} is free. Please use /payment/downgrade instead.`,
      });
    }

    let amountInPaise;
    let actionType = "purchase";

    if (currentPlan === "silver" && normalizedType === "gold") {
      amountInPaise = (MEMBERSHIP_AMOUNT.gold - MEMBERSHIP_AMOUNT.silver) * 100;
      actionType = "upgrade";
    } else {
      amountInPaise = MEMBERSHIP_AMOUNT[normalizedType] * 100;
    }

    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}_${user._id.toString().slice(-6)}`,
      notes: {
        firstName: user.firstName,
        lastName: user.lastName || "",
        emailId: user.emailId,
        membershipType: normalizedType,
        userId: user._id.toString(),
        actionType,
        previousPlan: currentPlan,
      },
    };

    const order = await razorpayInstance.orders.create(orderOptions);

    const payment = new Payment({
      userId: user._id,
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    const savedPayment = await payment.save();

    return res.status(201).json({
      ...savedPayment.toJSON(),
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay Order Creation Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

paymentRouter.post("/payment/downgrade", userAuth, async (req, res) => {
  try {
    const { targetMembershipType, membershipType } = req.body || {};
    const requestedTarget = (targetMembershipType || membershipType)?.toString().trim().toLowerCase();
    const user = req.user;

    if (!user.isPremium || !user.membershipType) {
      return res.status(400).json({
        error: "You do not have an active paid membership to downgrade.",
      });
    }

    const currentPlan = user.membershipType.toLowerCase();

    if (!requestedTarget || !["silver", "free"].includes(requestedTarget)) {
      return res.status(400).json({
        error: "Invalid downgrade option. Allowed targets: 'silver', 'free'",
      });
    }

    if (currentPlan === requestedTarget) {
      return res.status(400).json({
        error: `You are already on the ${requestedTarget} tier.`,
      });
    }

    if (currentPlan === "silver" && requestedTarget !== "free") {
      return res.status(400).json({
        error: "From silver tier, you can only downgrade to 'free'. Upgrading to 'gold' requires /payment/create.",
      });
    }

    if (requestedTarget === "silver") {
      user.isPremium = true;
      user.membershipType = "silver";
      await user.save();

      const payment = new Payment({
        userId: user._id,
        orderId: `downgrade_${Date.now()}_${user._id.toString().slice(-6)}`,
        status: "success",
        amount: 0,
        currency: "INR",
        receipt: `rcpt_dwng_${Date.now()}`,
        notes: {
          actionType: "downgrade",
          from: currentPlan,
          to: "silver",
        },
      });
      await payment.save();

      return res.json({
        success: true,
        message: "Membership downgraded to silver successfully.",
        isPremium: true,
        membershipType: "silver",
      });
    }

    if (requestedTarget === "free") {
      user.isPremium = false;
      user.membershipType = null;
      await user.save();

      const payment = new Payment({
        userId: user._id,
        orderId: `downgrade_${Date.now()}_${user._id.toString().slice(-6)}`,
        status: "success",
        amount: 0,
        currency: "INR",
        receipt: `rcpt_cancel_${Date.now()}`,
        notes: {
          actionType: "cancel",
          from: currentPlan,
          to: "free",
        },
      });
      await payment.save();

      return res.json({
        success: true,
        message: "Membership cancelled successfully. Reverted to free tier.",
        isPremium: false,
        membershipType: null,
      });
    }
  } catch (err) {
    console.error("Membership Downgrade Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

paymentRouter.post("/payment/verify", userAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
      });
    }

    const isSignatureValid = validatePaymentVerification(
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      },
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    );

    if (!isSignatureValid) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found for this order" });
    }

    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = "success";
    await payment.save();

    const user = await User.findById(payment.userId);
    if (user) {
      user.isPremium = true;
      user.membershipType = payment.notes?.membershipType || "silver";
      await user.save();
    }

    return res.json({
      success: true,
      message: "Payment verified successfully! Membership activated.",
      isPremium: true,
      membershipType: user ? user.membershipType : null,
    });
  } catch (err) {
    console.error("Payment Verification Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && webhookSignature) {
      const isWebhookValid = validateWebhookSignature(
        JSON.stringify(req.body),
        webhookSignature,
        webhookSecret,
      );

      if (!isWebhookValid) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const { event, payload } = req.body;

    if (event === "payment.captured") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const payment = await Payment.findOne({ orderId });
      if (payment) {
        payment.paymentId = paymentId;
        payment.status = "success";
        await payment.save();

        const user = await User.findById(payment.userId);
        if (user) {
          user.isPremium = true;
          user.membershipType = payment.notes?.membershipType || "silver";
          await user.save();
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const payment = await Payment.findOne({ orderId });
      if (payment) {
        payment.status = "failed";
        await payment.save();
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Razorpay Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      isPremium: Boolean(user.isPremium),
      membershipType: user.membershipType || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = paymentRouter;
