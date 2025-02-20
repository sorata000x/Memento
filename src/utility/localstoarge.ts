import { Note } from "../types";

const MAX_STORAGE_SIZE = 5000;

function getSizeInBytes(str: string) {
    return new Blob([str]).size; // Approximate size calculation
}

export function addNoteToLocalStorage(note: Note) {
    const storedDataStr = localStorage.getItem("notes") || "[]";
    const storedData = JSON.parse(storedDataStr) || [];

    console.log(`11:note: ${JSON.stringify({id: note.id, content: note.content})}`)
  
    // Add the new string to the array
    storedData.push(JSON.stringify(note));
  
    // Check total storage size
    while (getSizeInBytes(JSON.stringify(storedData)) > MAX_STORAGE_SIZE) {
      storedData.shift(); // Remove oldest entry
    }
  
    localStorage.setItem("notes", JSON.stringify(storedData));
}