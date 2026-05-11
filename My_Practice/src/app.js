const express = require("express");
const connectDB = require("./config/database");
const app = express();
const User = require("./models/user");

app.use(express.json());

app.post("/signup", async (req, res) => {
  // const userObj = {
  //   firstName: "Arsh",
  //   lastName: "Shaikh",
  //   emailId: "arsh@shaikh.com",
  //   password: "abcd@1234",
  // };

  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(`User added successfully!`);
  } catch (err) {
    res.status(400).send(`Something went wrong!`);
  }
});

// app.get("/findById", async (req, res) => {
//   try {
//     const user = await User.findById(req.body.userId);

//     if (!user) {
//       return res.status(404).send("User not found!");
//     }

//     res.status(200).send(user);
//     res.send(user);
//   } catch (err) {
//     console.log(err);
//     res.status(400).send(`User Not Found!`);
//   }
// });

app.get("/findById", async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).send(`User Not Found!`);
    }
    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(`Something Went Wrong`);
  }
});

app.get("/feed", async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (err) {
    res.status(400).send("Users not found!");
  }
});

app.patch("/update", async (req, res) => {
  const userId = req.body.userId;
  const data = req.body;

  try {
    await User.findByIdAndUpdate(userId, data);
    res.send(`User Data Updated successfully!`);
  } catch (err) {
    res.status(400).send(`Something went wrong!`);
  }
});

app.delete("/delete", async (req, res) => {
  const userId = req.body.userId;

  try {
    const user = await User.findByIdAndDelete(userId);
    res.send(`User Deleted successfully!`);
  } catch (err) {
    res.status(400).send(`User Not Found`);
  }
});

connectDB()
  .then(() => {
    console.log(`Database Connected successfully!`);
    app.listen(7863, () => {
      console.log(`Server successfully running...`);
    });
  })
  .catch((err) => {
    console.log(err);
    console.error(`Database cannot be connected. Please check!`);
  });
