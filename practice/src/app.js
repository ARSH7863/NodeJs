require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database.js");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

// =========================
// MIDDLEWARE
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  "http://13.61.17.142",
  "https://devtinder-alf.pages.dev",
  "https://devtinder7863.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);


app.use(express.json());
app.use(cookieParser());

// =========================
// ROUTES
// =========================

const authRouter = require("./routes/auth.js");
const profileRouter = require("./routes/profile.js");
const requestRouter = require("./routes/request.js");
const userRouter = require("./routes/user.js");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);

// =========================
// DATABASE + SERVER
// =========================

connectDB()
  .then(() => {
    console.log("Database connected successfully...");

    app.listen(7777, () => {
      console.log("Server running on port 7777");
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected:", err);
  });
