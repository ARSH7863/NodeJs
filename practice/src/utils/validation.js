const validator = require("validator");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password, photoURL } = req.body;

  if (!firstName) {
    throw new Error(`Enter your first name!`);
  } else if (firstName.length < 4 || firstName.length > 50) {
    throw new Error(`First Name should be between 4 - 50 characters`);
  } else if (!validator.isEmail(emailId)) {
    throw new Error(`Email is Not Valid!`);
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(`Password is Not Valid!`);
  }
};

module.exports = { validateSignUpData };
