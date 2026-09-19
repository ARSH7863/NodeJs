require("dotenv").config();
const AWS = require("aws-sdk");

// Configure AWS credentials and region from .env
AWS.config.update({
  region: process.env.AWS_REGION || "eu-north-1",
  accessKeyId: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

/**
 * Send an email via AWS SES
 * @param {Object} options
 * @param {string|string[]} options.toAddresses - Recipient email or array of emails
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Plain text body
 * @param {string} [options.htmlBody] - HTML body (optional, falls back to body)
 * @param {string} [options.sender] - Sender email (defaults to AWS_SES_SENDER env var)
 */
const sendEmail = async ({
  toAddresses,
  subject,
  body,
  htmlBody,
  sender = process.env.AWS_SES_SENDER,
}) => {
  const recipients = Array.isArray(toAddresses) ? toAddresses : [toAddresses];

  const params = {
    Destination: {
      ToAddresses: recipients,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody || body,
        },
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: sender,
  };

  try {
    const data = await ses.sendEmail(params).promise();
    console.log("Email sent successfully! MessageId:", data.MessageId);
    return data;
  } catch (err) {
    console.error("AWS SES sendEmail Error:", err.message);
    throw err;
  }
};

/**
 * Quick helper function (matches Namaste Node.js / AWS snippet pattern)
 */
const run = async (
  subject = "New Connection Request",
  body = "Hi User,\n\nYou got a new connection request from a developer.\n\nYour DevTinder.",
  toEmail,
) => {
  const recipient = toEmail || process.env.AWS_SES_SENDER;
  return await sendEmail({
    toAddresses: [recipient],
    subject,
    body,
    htmlBody: `<h1>${subject}</h1><p>${body}</p>`,
  });
};

module.exports = {
  sendEmail,
  run,
};
