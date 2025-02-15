const MAX_STORAGE_SIZE = 5000;

function getSizeInBytes(str: string) {
    return new Blob([str]).size; // Approximate size calculation
}

export function addNoteToLocalStorage(note: string) {
    let notes = localStorage.getItem("notes") || "[]";
    let storedData = JSON.parse(notes) || [];
  
    // If the new string alone is too large, trim it
    if (getSizeInBytes(note) > MAX_STORAGE_SIZE) {
      note = note.slice(0, MAX_STORAGE_SIZE); // Trim the string
    }
  
    // Add the new string to the array
    storedData.push(note);
  
    // Check total storage size
    while (getSizeInBytes(JSON.stringify(storedData)) > MAX_STORAGE_SIZE) {
      storedData.shift(); // Remove oldest entry
    }
  
    localStorage.setItem("notes", JSON.stringify(storedData));
}