# Lecture Hall Orchestrator: Teacher-to-Student Live Features Guide

This guide outlines the real-time interactive capabilities available on the **Teacher Dashboard** and details how they sync with and drive the student-facing experience in the classroom.

---

## 🗺️ 1. Core Presenter View State Router (`rooms` Table)
The **Teacher Dashboard** acts as the remote control for every student's screen. By updating the room's current state, the teacher instantly transitions all connected student devices to the active module.

| State / Screen Mode | What Students See | Teacher Capabilities |
| :--- | :--- | :--- |
| **`Lobby / Waiting`** | An ambient waiting lounge featuring animated cosmic radials and lecture detail cards. | Customize the **Subject Name** and **Teacher Name** shown to students prior to starting. |
| **`Overview`** | The live comprehension (Pace Check) feedback meter. | View an aggregate visual breakdown of student understanding in real-time. |
| **`MCQ Quiz Launcher`** | The active dynamic multiple-choice question. | Launch quizzes, lock submissions, and toggle **"Reveal Correct Answer"** to highlight correct/incorrect choices. |
| **`Live Surveys`** | The active interactive poll. | Launch custom polls, see live voting distributions, and guide discussions. |
| **`Presenting Arena`** | Synchronized concept slides & interactive flashcard console. | Sync lecture topics. Promote any student to **"Speaker"** to turn on their broadcast notes console. |
| **`Live Q&A Board`** | A collaborative student-led forum. | Review and address crowd-sourced questions sorted automatically by upvote counts. |
| **`Speed Typer Arena`** | An interactive speed-typing playground. | Launch typing exercises and showcase a real-time leaderboard of speed and accuracy. |
| **`Dismissed / Ended`** | A clean, elegant lecture-ended summary card. | Wrap up the presentation and dismiss the classroom. |

---

## 📈 2. Real-time Student Comprehension Pace Checks
Instead of asking "Is everyone following?", the teacher can review the continuous live pace-meter.
* **Student Input:** At any time, students can submit/update their live comprehension status (**Understood**, **Getting Lost**, or **Confused**).
* **Teacher View:** The dashboard translates these votes into an aggregate live status chart, allowing teachers to instantly identify when they need to slow down or elaborate.

---

## 🗳️ 3. Live Classroom Surveys & Polls
Teachers can instantly design and publish live questions to gather quick classroom opinions.
* **Teacher View:** Set up custom poll questions with matching option fields and broadcast them. As students vote, the option distribution counts update instantly in front of the teacher with real-time feedback.
* **Student View:** Receives the poll structure instantly, selects an option, and receives immediate visual confirmation.

---

## ❓ 4. Crowd-Sourced Live Q&A Forum
Allows students to submit questions anonymously or with their names, avoiding the friction of raising hands.
* **Student View:** Write and submit questions to the room board. Students can read questions submitted by their peers and **upvote** queries they also want answered.
* **Teacher View:** A clean dashboard displays all questions automatically sorted by upvotes (`votes DESC`), highlighting the most pressing questions at the top of the queue.

---

## ⌨️ 5. Speed Typer Playground & Leaderboard
An educational game to boost typing speed, accuracy, and focus during lecture breaks.
* **Teacher View:** Select an interactive prompt or custom paragraph and launch the match.
* **Student View:** Race against the clock, typing the text while tracking live metrics.
* **Teacher Leaderboard:** Displays a live classroom board listing student names, words-per-minute (WPM), accuracy, and total completion time.

---

## 🎓 6. Student designated Presenter / Speaker Promotion
In **Presenting Arena (synced flashcards)** mode, the teacher can designate a specific student as the active speaker.
* **Promoting a Speaker:** The teacher selects a student from the active list.
* **Speaker Console:** The chosen student's portal automatically transforms into a broadcast console, enabling them to share live presentation notes and lead the classroom discussion dynamically.
