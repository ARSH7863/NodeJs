const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      index: true,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error(`Email is not valid.`);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,

      enum: {
        values: ["male", "female", "other"],
        message: `{VALUE} is not a valid gender type`,
      },
      // validate(value) {
      //   if (!["male", "female", "other"].includes(value)) {
      //     throw new Error(`Gender Data is not Valid!`);
      //   }
      // },
    },
    photoURL: {
      type: String,
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error(`Invalid Photo URL: ${value}`);
        }
      },
      default:
        "https://media.istockphoto.com/id/1451587807/vector/user-profile-icon-vector-avatar-or-person-icon-profile-picture-portrait-symbol-vector.jpg?s=2048x2048&w=is&k=20&c=-g-2McKwLpsyYHPDT3Wf1oo2ppTmNxq797heiFJmwSM=",
    },
    about: {
      type: String,
      default: "This is a default about of the users",
    },
    skills: {
      type: [String],
    },
    githubId: {
      type: String,
    },
    googleId: {
      type: String,
    },
    password: {
      type: String,
      required: function () {
        return !this.githubId && !this.googleId;
      },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
      enum: ["silver", "gold"],
    },
  },
  { timestamps: true },
);

userSchema.index({ gender: 1 });

userSchema.methods.getJWT = async function () {
  const user = this;

  return jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  if (!passwordHash || !passwordInputByUser) {
    return false;
  }

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    passwordHash,
  );

  return isPasswordValid;
};

const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
