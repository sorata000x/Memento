import { User } from "@supabase/supabase-js";
import { Note, Response } from "../types";

const MAX_STORAGE_SIZE = 5 * 1024 * 1024; 

function getSizeInBytes(str: string) {
    return new Blob([str]).size; // Approximate size calculation
}

export function addNoteToLocalStorage(user: User | null, note: Note) {
  console.log(`addNoteToLocalStorage: ${JSON.stringify({...note})}`)
    const storedNotesStr = localStorage.getItem(`${user?.id}-notes` || "guest-notes") || "[]";
    const storedNotes = JSON.parse(storedNotesStr) || [];
    // Add the new string to the array without embedding
    storedNotes.push(JSON.stringify({...note, embedding: []}));
    // Check total storage size
    while (getSizeInBytes(JSON.stringify(storedNotes)) > MAX_STORAGE_SIZE) {
      storedNotes.shift(); // Remove oldest entry
    }
    localStorage.setItem(`${user?.id}-notes` || "guest-notes", JSON.stringify(storedNotes));
}

export function addResponseToLocalStorage(user: User | null, response: Response) {
    const storedResponsesStr = localStorage.getItem(`${user?.id}-responses` || "guest-responses") || "[]";
    const storedResponses = JSON.parse(storedResponsesStr) || [];
    // Add the new string to the array without embedding
    storedResponses.push(JSON.stringify({...response, embedding: []}));
    // Check total storage size
    while (getSizeInBytes(JSON.stringify(storedResponses)) > MAX_STORAGE_SIZE) {
      storedResponses.shift(); // Remove oldest entry
    }
    localStorage.setItem(`${user?.id}-responses` || "guest-responses", JSON.stringify(storedResponses));
}