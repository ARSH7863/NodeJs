const express = require("express");
const connectDB = require("./config/database.js");
const app = express();
const User = require("./models/user.js");
const { validateSignUpData } = require("./utils/validation.js");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cookieParser());

// Creating a new Instance of the User model
app.post("/signup", async (req, res) => {
  // console.log(req.body);

  // const userObj = {
  //   firstName: "Mahendra Singh",
  //   lastName: "Dhoni",
  //   emailId: "msd@gmail.com",
  //   password: "dhonibhai",
  // };

  // Validation of Data
  validateSignUpData(req);

  const { firstName, lastName, emailId, password } = req.body;

  // Encrypt the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create a new instance of the User model

  try {
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    await user.save();
    res.send(`User added successfully`);
  } catch (err) {
    res.status(400).send(`Error saving the user: ${err.message}`);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error(`Invalid credentials`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      // Create a JWT Token

      const token = await jwt.sign({ _id: user._id }, "ArshShaikh@12");
      console.log(token);

      // Add the token to cookie and send the response back to the user
      res.cookie("token", "test token");

      res.send(`Login Successful!`);
    } else {
      return res.status(400).send(`Invalid credentials`);
    }
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get("/profile", async (req, res) => {
  const cookies = req.cookies;

  const { token } = cookies;
  // Validate My Token
  const decodedMessage = await jwt.verify(token, "ArshShaikh@12");
  console.log(decodedMessage);

  console.log(cookies);
  res.send(`Reading cookies`);
});

app.get("/user", async (req, res) => {
  // console.log(req);
  const userEmail = req.body.emailId;

  try {
    const user = await User.findOne({ emailId: userEmail });

    if (!user) {
      return res.status(404).send(`User Not Found`);
    } else {
      res.send(user);
    }
  } catch (err) {
    res.status(400).send(`Something went wrong!`);
  }
});

app.get("/feed", async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (err) {
    res.status(400).send(`Something went wrong!`);
  }
});

app.delete("/user/:userId", async (req, res) => {
  const userId = req.params?.userId;

  try {
    const user = await User.findByIdAndDelete(userId);
    res.send(`User Deleted successfully!`);
  } catch (err) {
    res.status(400).send(`User Not Found`);
  }
});

app.patch("/user/:userId", async (req, res) => {
  const userId = req.params?.userId;
  const data = req.body;

  try {
    const ALLOWED_UPDATES = ["photoURL", "about", "gender", "age", "skills"];

    const isUpdateAllowed = Object.keys(data).every((k) =>
      ALLOWED_UPDATES.includes(k),
    );

    if (!isUpdateAllowed) {
      throw new Error(`Update Not Allowed!`);
    }

    if (data?.skills.length > 10) {
      throw new Error(`Skills cannot be more than 10.`);
    }

    const updatedUser = await User.findByIdAndUpdate({ _id: userId }, data, {
      returnDocument: "after",
      runValidators: true,
    });

    res.send(`User Updated Successfully!`);
  } catch (err) {
    res.status(400).send(`Update Failed: ${err.message}`);
  }
});

connectDB()
  .then(() => {
    console.log(`Database connected successfully...`);
    app.listen(7777, () => {
      console.log(`Server connected successfully`);
    });
  })
  .catch((err) => {
    console.error(`Database cannot be connected.`);
  });
