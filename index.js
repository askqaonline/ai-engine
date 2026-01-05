import fs from "fs";

// Read Tamil input text
const text = fs.readFileSync("input.txt", "utf8");

// Print it to console
console.log("INPUT TEXT:");
console.log(text);
