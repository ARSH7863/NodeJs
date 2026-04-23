const fs = require("fs");

const a = 100;

setImmediate(() => {
  console.log(`setImmediate`);
});

Promise.resolve().then(() => {
  console.log(`Promise`);
});

fs.readFile("./file.txt", "utf-8", () => {
  console.log(`File Reading CB`);
});

setTimeout(() => {
  console.log(`Timer Expired`);
}, 0);

process.nextTick(() => {
  console.log(`process.nextTick`);
});

function printA() {
  console.log(`a =`, a);
}

printA();
console.log(`Last Line of the File`);

// Output
// a = 100
// Last Line of the File
// process.nextTick
// Promise
// Timer Expired
// setImmediate
// File Reading CB
