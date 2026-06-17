/**
 * Data structures for the Gamified Classroom Faculty Dashboard.
 */

export interface Activity {
  id: string;
  question: string;
  options: string[]; // e.g. ["Option A", "Option B", "Option C", "Option D"]
  correctAnswer: string; // e.g. "A", "B", "C", "D"
  timeLimit: number; // in seconds
}
