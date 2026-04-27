const express = require("express");
const { adminAuth, userAuth } = require("./middleware/auth.js");

const app = express();

app.use("/admin", adminAuth);
app.use("/user", userAuth);

app.get("/admin/getUserData", (req, res) => {
  res.send(`User Data Generated!`);
});

app.get("/admin/deleteUserData", (req, res) => {
  res.send(`User Data Deleted!`);
});

app.get(`/user`, (req, res) => {
  res.send(`User Log In!`);
});

app.get("/user/data", (req, res) => {
  res.send(`User details!`);
});

app.listen(7777, () => {
  console.log(`Server running on Port 7777`);
});
