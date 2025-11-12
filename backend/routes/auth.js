import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🧠 Helper: assign admin role based on .env ADMIN_EMAILS
const adminEmails = process.env.ADMIN_EMAILS.split(",");

// 📝 SIGNUP
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const [exists] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (exists.length > 0) return res.status(400).send("Email already exists");

    const hashed = await bcrypt.hash(password, 10);
    const role = adminEmails.includes(email) ? "admin" : "candidate";
    await db.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashed, role]);

    res.send("Signup successful! Please log in.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error during signup.");
  }
});

// 🔑 LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).send("User not found");

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send("Invalid password");

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error during login.");
  }
});

export default router;
