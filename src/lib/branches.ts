export const BRANCHES = ["CSE", "CSM", "CSD", "CS", "CIVIL", "ECE"] as const;
export type Branch = typeof BRANCHES[number];
export const SEMESTERS = [1, 2, 3, 4, 5, 6] as const;

export const EXAM_TYPES = [
  { value: "mid1", label: "Mid-1" },
  { value: "mid2", label: "Mid-2" },
  { value: "sem", label: "Semester" },
] as const;

export const NOTE_CATEGORIES = [
  { value: "unit", label: "Unit Notes" },
  { value: "assignment", label: "Assignments" },
  { value: "lab", label: "Lab Manuals" },
  { value: "important", label: "Important Questions" },
] as const;