import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import db from "../db.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Storage for uploaded question files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).send("Forbidden");
    req.user = decoded;
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

// 📤 Upload Test
router.post("/upload", verifyAdmin, upload.single("file"), async (req, res) => {
  const { course, testName } = req.body;
  const filePath = req.file.path;

  try {
    // Insert or find course
    let [rows] = await db.query("SELECT id FROM courses WHERE course_name = ?", [course]);
    let courseId;
    if (rows.length === 0) {
      const [result] = await db.query("INSERT INTO courses (course_name) VALUES (?)", [course]);
      courseId = result.insertId;
    } else {
      courseId = rows[0].id;
    }

    // Insert test
    await db.query("INSERT INTO tests (course_id, test_name, file_path) VALUES (?, ?, ?)", [courseId, testName, filePath]);
    res.send("Test uploaded successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading test.");
  }
});

// 📋 View All Tests
router.get("/tests", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.id, c.course_name, t.test_name, t.file_path
      FROM tests t
      JOIN courses c ON t.course_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching tests");
  }
});

export default router;
