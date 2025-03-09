import { User } from "@supabase/supabase-js";
import { Note } from "../types";

export const getNotesFromLocalStorage = (user: User | null): Note[] => {
    let storedNotesStr = localStorage.getItem(user ? user.id : "guest");
    if(!storedNotesStr) return [];
    let storedNotes = JSON.parse(storedNotesStr);
    return storedNotes;
}

export function upsertNoteToLocalStorage(user: User | null, note: Note) {
  const storageKey = user ? user.id : "guest";
  const storedNotesStr = localStorage.getItem(storageKey) || "[]";
  let storedNotes: Note[] = JSON.parse(storedNotesStr);

  // Find the index of the note by a unique identifier (e.g., note.id)
  const existingIndex = storedNotes.findIndex((n) => n.id === note.id);

  if (existingIndex !== -1) {
    // Note exists → Update it
    storedNotes[existingIndex] = { ...note, created_at: storedNotes[existingIndex].created_at };
  } else {
    // Note does not exist → Add new
    storedNotes.push({ ...note });
  }

  // Ensure storage size does not exceed limit
  while (storedNotes.length > 10) {
    storedNotes.shift(); // Remove oldest entry
  }

  // Save back to localStorage
  localStorage.setItem(storageKey, JSON.stringify(storedNotes));
}