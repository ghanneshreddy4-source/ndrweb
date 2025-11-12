import express from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import db from "../db.js";

const router = express.Router();

// 🧩 Middleware: verify any logged-in user
function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Token missing");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

// 📘 Get all courses
router.get("/courses", verifyUser, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM courses");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching courses");
  }
});

// 📗 Get tests by course
router.get("/tests/:courseId", verifyUser, async (req, res) => {
  const { courseId } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM tests WHERE course_id = ?", [courseId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching tests");
  }
});

// 📙 Start Test (load questions)
router.get("/start/:testId", verifyUser, async (req, res) => {
  const { testId } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM tests WHERE id = ?", [testId]);
    if (rows.length === 0) return res.status(404).send("Test not found");

    const file = fs.readFileSync(rows[0].file_path, "utf-8");
    const lines = file.trim().split("\n").map(line => {
      const parts = line.split("|");
      return {
        question: parts[0],
        options: parts.slice(1, 5),
        answer: parts[5],
        explanation: parts[6],
      };
    });
    res.json(lines);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading test");
  }
});

// 📘 Submit test
router.post("/submit", verifyUser, async (req, res) => {
  const { testId, answers } = req.body;
  const userId = req.user.id;

  try {
    const [rows] = await db.query("SELECT * FROM tests WHERE id = ?", [testId]);
    const file = fs.readFileSync(rows[0].file_path, "utf-8");
    const questions = file.trim().split("\n").map(line => line.split("|"));

    let score = 0;
    let total = 0;
    let results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const correct = q[5];
      const selected = answers[i];
      total++;
      if (selected == correct) score++;
      results.push({
        question: q[0],
        selected,
        correct,
        explanation: q[6],
      });
    }

    await db.query("INSERT INTO responses (user_id, test_id, score, answers) VALUES (?, ?, ?, ?)", [
      userId,
      testId,
      score,
      JSON.stringify(results),
    ]);

    res.json({ score, total, results });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting test");
  }
});

// 📊 Get latest result
router.get("/result/:testId", verifyUser, async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      "SELECT * FROM responses WHERE user_id = ? AND test_id = ? ORDER BY id DESC LIMIT 1",
      [userId, testId]
    );
    if (rows.length === 0) return res.status(404).send("No result found");
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching result");
  }
});

export default router;
