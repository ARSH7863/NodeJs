const validator = require("validator");

const validateSignUpData = (req) => {
<<<<<<< HEAD
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error(`Name is not Valid`);
  } else if (!validator.isEmail(emailId)) {
    throw new Error(`Email is not valid!`);
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(`Password is not valid!`);
=======
  const { firstName, lastName, emailId, password,photoURL } = req.body;

  if (!firstName) {
    throw new Error(`Enter your first name!`);
  } else if (firstName.length < 4 || firstName.length > 50) {
    throw new Error(`First Name should be between 4 - 50 characters`);
  } else if (!validator.isEmail(emailId)) {
    throw new Error(`Email is Not Valid!`);
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(`Password is Not Valid!`);
>>>>>>> 3105e54ad50bd91c8cc112bdf60da4212cee109f
  }
};

module.exports = { validateSignUpData };
