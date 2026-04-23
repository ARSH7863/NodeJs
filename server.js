const http = require("http");

const server = http.createServer(function (req, res) {
  if (req.url === "/getSecretData") {
    return res.end("This is a secret!");
  }

  res.end("Hello World Again!");
});

server.listen(7777);
