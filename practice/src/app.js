const express = require("express");
const connectDB = require("./config/database.js");
const app = express();
const User = require("./models/user.js");
const { validateSignUpData } = require("./utils/validation.js");

app.use(express.json());

// Creating a new Instance of the User model
app.post("/signup", async (req, res) => {
  // console.log(req.body);

  // const userObj = {
  //   firstName: "Mahendra Singh",
  //   lastName: "Dhoni",
  //   emailId: "msd@gmail.com",
  //   password: "dhonibhai",
  // };

  // Validation of data

  // Encrypt the password

  // Creating a new User instance of the User Model
  try {
    const user = new User(req.body);
    await user.save();
    res.send(`User added successfully`);
  } catch (err) {
    res.status(400).send(`Error saving the user: ${err.message}`);
  }
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
