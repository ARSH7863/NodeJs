const adminAuth = (req, res, next) => {
  console.log(`Admin access is being checked`);

  const token = "xyz";
  const isAdminAuthorized = token === "xyz";

  if (!isAdminAuthorized) {
    res.status(401).send(`Unauthorized Token`);
  } else {
    next();
  }
};

const userAuth = (req, res, next) => {
  console.log(`User access is being checked`);

  const token = "abc";
  const isAdminAuthorized = token === "xyz";

  if (!isAdminAuthorized) {
    res.status(401).send(`Unauthorized Token`);
  } else {
    next();
  }
};

module.exports = {
  adminAuth,
  userAuth,
};
