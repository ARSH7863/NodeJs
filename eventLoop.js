// const fs = require("fs");

// const a = 100;

// Promise.resolve.("Promise").then(() => console.log("Promise"));

// fs.readFile("./file.txt", "utf-8", () => {
//   console.log(`File reading CB`);
// });

// setTimeout(() => {
//   console.log(`Timer Expired`);
// }, 0);

// process.nextTick(() => console.log(`Process.nextTick()`));

// function printA() {
//   console.log(`a :`, a);
// }

// printA();

// console.log(`Last Line of the Code`);

// const fs = require("fs");
// const a = 100;

// setImmediate(() => console.log("Immediate"));

// Promise.resolve("Promise").then(() => console.log("Promise 2"));

// fs.readFile("./file.txt", "utf-8", () => console.log(`File Reading CB`));

// setTimeout(() => console.log(`Timer Expired`), 0);

// process.nextTick(() => console.log(`Process.nextTick()`));

// function printA() {
//   console.log(`a = `, a);
// }

// printA();
// console.log(`Last Line of the Code`);

// Output

// a = 100;
// Last Line of the code

// Process.nextTick()
// Promise
// Timer Expired
// Immediate

// File reading CB

// const fs = require("fs");

// const a = 100;

// setImmediate(() => {
//   console.log(`Set Immediate`);
// });

// fs.readFile("./file.txt", "utf-8", () => {
//   console.log(`File Reading CB`);
// });

// setTimeout(() => {
//   console.log(`Timer Expired`);
// }, 0);

// function printA() {
//   console.log(`a = `, a);
// }

// printA();

// console.log(`Last Line of the file.`);

// Output
// 100
// Last Line of the file.
// Timer Expired
// Set Immediate
// File Reading CB

// const b = 100;

// setImmediate(() => {
//   console.log(`Set Immediate`);
// });

// Promise.resolve().then(() => {
//   console.log("Promise");
// });

// fs.readFile("./file.txt", "utf-8", () => {
//   console.log(`File Reading CB`);
// });

// setTimeout(() => {
//   console.log(`Timer Expired`);
// }, 0);

// process.nextTick(() => {
//   console.log(`process.nextTick()`);
// });

// function printB() {
//   console.log(`b = `, b);
// }

// printB();
// console.log(`Last Line of the Code`);

// // Output
// // 100
// // Last Line of the Code
// // process.nextTick()
// // Promise
// // Timer Expired
// // Set Immediate
// // File Reading CB

const fs = require("fs");

setImmediate(() => {
  console.log(`setImmediate`);
});

setTimeout(() => {
  console.log(`Timer Expired`);
}, 0);

Promise.resolve().then(() => {
  console.log(`Promise`);
});

fs.readFile("./file.txt", "utf-8", () => {
  setTimeout(() => console.log(`2nd Timer`), 0);

  process.nextTick(() => {
    console.log(`2nd NextTick`);
  });

  setImmediate(() => {
    console.log(`2nd setImmediate`);
  });

  console.log(`File Reading CB`);
});

process.nextTick(() => {
  console.log(`process.nextTick()`);
});

console.log(`Last Line of the File`);

// Output
// Last Line of the File
// process.nextTick()
