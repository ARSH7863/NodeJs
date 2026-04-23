const express = require("express");
const app = express();

app.get(
  "/user",
  (req, res, next) => {
    // res.send(`Hello From The User!`);
    console.log(`Hello From User 1`);

    next();
  },
  (req, res, next) => {
    // res.send(`Hello From User 2`);
    console.log(`Hello From User 2`);
    next();
  },
  (req, res, next) => {
    // res.send(`Hello From User 3`);
    console.log(`Hello From User 3`);
    next();
  },
  (req, res, next) => {
    // res.send(`Hello From User 4!`);
    console.log(`Hello From User 4`);
    next();
  },
  (req, res) => {
    res.send(`Hello From User 5!`);
    console.log(`Hello From User 5`);
  },
);

app.listen("7777", () => {
  console.log(`Server successfully running on Port 7777`);
});
