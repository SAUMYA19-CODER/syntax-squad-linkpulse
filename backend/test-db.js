import db from "./db.js";

console.log("Testing Aiven MySQL connection...");

try {
const result = await db.query("SELECT 1 AS test");
console.log("Database connection successful!");
console.log(result[0]);
} catch (error) {
console.log("Error name:", error.name);
console.log("Error message:", error.message);
console.log("Error details:", error.stack);
} finally {
await db.end();
}
