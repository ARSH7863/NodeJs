const express = require("express");
const connectDB = require("./config/database.js");
const app = express();
const User = require("./models/user.js");

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

  try {
    const user = new User(req.body);
    await user.save();
    res.send(`User added successfully`);
  } catch (err) {
    res.status(400).send(`Error saving the user: ${err.message}`);
  }
});

app.get("/user", async (req, res) => {
  const userEmail = req.body.emailId;

  try {
    const users = await User.findOne({ emailId: userEmail });

    if (users.length === 0) {
      res.status(404).send(`User Not Found`);
    } else {
      res.send(users);
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

app.delete("/user", async (req, res) => {
  const userId = req.body.userId;

  try {
    const user = await User.findByIdAndDelete(userId);
    res.send(`User Deleted successfully!`);
  } catch (err) {
    res.status(400).send(`User Not Found`);
  }
});

app.patch("/user", async (req, res) => {
  const userId = req.body.userId;
  const data = req.body;
  try {
    await User.findByIdAndUpdate({ _id: userId }, data);
    res.send(`User Updated Successfully!`);
  } catch (err) {
    res.status(400).send(`User Not Found`);
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
