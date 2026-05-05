const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://arsh7863:arshshaikh3@express-test.cuieldb.mongodb.net/learning",
  );
};

module.exports = connectDB;
