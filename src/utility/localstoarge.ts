import { User } from "@supabase/supabase-js";
import { Note } from "../types";

const MAX_STORAGE_SIZE = 5 * 1024 * 1024; 

function getSizeInBytes(str: string) {
    return new Blob([str]).size; // Approximate size calculation
}

export function addNoteToLocalStorage(user: User | null, note: Note) {
    const storedDataStr = localStorage.getItem(user?.id || "guest") || "[]";
    const storedData = JSON.parse(storedDataStr) || [];
  
    // Add the new string to the array without embedding
    storedData.push(JSON.stringify((({ embedding, ...rest }) => rest)(note)));
  
    // Check total storage size
    while (getSizeInBytes(JSON.stringify(storedData)) > MAX_STORAGE_SIZE) {
      storedData.shift(); // Remove oldest entry
    }
  
    localStorage.setItem(user?.id || "guest", JSON.stringify(storedData));
}