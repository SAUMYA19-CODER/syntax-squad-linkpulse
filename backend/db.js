

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config({
  path: new URL("./.env", import.meta.url)
});

let caCertificate;

if (process.env.DB_CA_CERT) {
  // Use the certificate supplied through Render's environment variables.
  caCertificate = process.env.DB_CA_CERT.replace(/\\n/g, "\n");
} else {
  // Use the local certificate when running on your computer.
  caCertificate = fs.readFileSync(
    new URL("./ca.pem", import.meta.url),
    "utf8"
  );
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: caCertificate
  },
  waitForConnections: true,
  connectionLimit: 10
});

export default db;

