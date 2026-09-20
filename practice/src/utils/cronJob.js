const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const ConnectionRequestModel = require("../models/connectionRequest");
const sendEmail = require("./sendEmail");

cron.schedule("* 8 * * *", async () => {
  try {
    const yesterday = subDays(new Date(), 1);

    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const pendingRequests = await ConnectionRequestModel.find({
      status: "interested",
      createdAt: {
        $gte: yesterdayStart,
        $lt: yesterdayEnd,
      },
    }).populate("fromUserId toUserId");

    const listOfEmails = [
      ...new Set(
        pendingRequests.map((req) => req.toUserId?.emailId).filter(Boolean),
      ),
    ];

    for (const email of listOfEmails) {
      // Send Emails
      try {
        const response = await sendEmail.run(
          "New Friend Request Pending for " + email,
          "There are many requests pending, please login to DevTinder to accept/reject requests",
          email,
        );
        console.log(response);
      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
});
