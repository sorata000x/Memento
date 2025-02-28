import { User } from "@supabase/supabase-js";
import { Note, Response } from "../types";

const MAX_STORAGE_SIZE = 5 * 1024 * 1024; 

function getSizeInBytes(str: string) {
    return new Blob([str]).size; // Approximate size calculation
}

export function upsertNoteToLocalStorage(user: User | null, note: Note) {
  const storageKey = user ? `${user?.id}-notes` : "guest-notes";
  const storedNotesStr = localStorage.getItem(storageKey) || "[]";
  let storedNotes: Note[] = JSON.parse(storedNotesStr);

  // Find the index of the note by a unique identifier (e.g., note.id)
  const existingIndex = storedNotes.findIndex((n) => n.id === note.id);

  if (existingIndex !== -1) {
    // Note exists → Update it
    storedNotes[existingIndex] = { ...note, embedding: [], last_updated: storedNotes[existingIndex].last_updated };
  } else {
    // Note does not exist → Add new
    storedNotes.push({ ...note, embedding: [] });
  }

  // Ensure storage size does not exceed limit
  while (getSizeInBytes(JSON.stringify(storedNotes)) > MAX_STORAGE_SIZE) {
    storedNotes.shift(); // Remove oldest entry
  }

  // Save back to localStorage
  localStorage.setItem(storageKey, JSON.stringify(storedNotes));
}

export function upsertResponseToLocalStorage(user: User | null, response: Response) {
  const storageKey = user ? `${user?.id}-responses` : "guest-responses";
  const storedResponsesStr = localStorage.getItem(storageKey) || "[]";
  let storedResponses: Response[] = JSON.parse(storedResponsesStr);

  // Find the index of the response by a unique identifier (e.g., response.id)
  const existingIndex = storedResponses.findIndex((r) => r.id === response.id);

  if (existingIndex !== -1) {
    // Response exists → Update it
    storedResponses[existingIndex] = { ...response, embedding: [] };
  } else {
    // Response does not exist → Add new
    storedResponses.push({ ...response, embedding: [] });
  }

  // Ensure storage size does not exceed limit
  while (getSizeInBytes(JSON.stringify(storedResponses)) > MAX_STORAGE_SIZE) {
    storedResponses.shift(); // Remove oldest entry
  }

  // Save back to localStorage
  localStorage.setItem(storageKey, JSON.stringify(storedResponses));
}