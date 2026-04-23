const fs = require("fs");
const https = require("https");

console.log("Hello World!");

var a = 1078698;
var b = 20986;

// Synchronous code
fs.readFileSync("./file.txt", "utf-8");
console.log(`This will execute only after the file is read`);

https.get("https://dummyjson.com/products/1", (res) => {
  console.log(`Data Fetched Successfully`);
});

setTimeout(() => {
  console.log(`SetTimeout called after 5 seconds`);
}, 5000);

fs.readFile("./file.txt", "utf-8", (err, data) => {
  console.log(`File Data:`, data);
});

function multiplyFn(x, y) {
  const result = x * y;
  return result;
}

var c = multiplyFn(a, b);
console.log(`Multiplication result is:`, c);
