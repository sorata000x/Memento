import { User } from "@supabase/supabase-js";
import { deleteNote, upsertNote } from "../api/notes";
import { Note } from "../types";
import {v4 as uuid} from 'uuid';
import IndexedDB from "../utility/indexdb";

export interface StateData {
  notes: Note[];
  user: User | null;
  editingNote: Note | null;
  deletingNote: Note | null;
  indexedDB: IndexedDB | null;
  firstRender: boolean; // Flag to scroll to the bottom when first rendered
}

export interface StateAction {
  type: string;
  id: string;
  content: string;
  role: string;
  file_paths: string[];
  query: string;
  newNotes: Note[];
  user: User;
  knowledge_base: {id: string, similarity: number}[];
  note: Note;
  hide: boolean;
  db: IndexedDB;
}

// Get initial state from local storage or set to empty
const getInitialState = (): StateData => {
  return {
    user: null,
    notes: [],
    editingNote: null,
    deletingNote: null,
    indexedDB: null,
    firstRender: true,
  }
};

export const initialState: StateData = getInitialState();

const reducer = (state: StateData, action: StateAction): StateData => {
  switch (action.type) {
    case "INIT": {
      console.debug("INIT");
      return getInitialState();
    }
    case "SET_INDEXED_DB": {
      console.debug("SET_INDEXED_DB");
      if (action.db === undefined) {
        console.error("Operation SET_INDEXED_DB requires {db} attribute");
        return state;
      }
      return {
        ...state,
        indexedDB: action.db
      }
    }
    case "SET_USER": {
      console.debug("SET_USER");
      if (action.user === undefined) {
        console.error("Operation SET_USER requires {user} attribute");
        return state;
      }
      console.log(`66user: ${JSON.stringify(action.user)}`)
      return {
        ...state,
        user: action.user
      }
    }
    // Set state only
    case "SET_NOTES": {
      console.debug("SET_NOTES");
      if (action.newNotes === undefined) {
        console.error("Operation SET_NOTES requires {newNotes} attribute");
        return state;
      }
      return {
        ...state,
        notes: action.newNotes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        firstRender: false
      }
    }
    case "ADD_NOTES": {
      console.debug("ADD_NOTES");
      if (action.newNotes === undefined) {
        console.error("Operation ADD_NOTES requires {newNotes} attribute");
        return state;
      }
      // Get existing note IDs
      const existingIds = new Set(state.notes.map(note => note.id));
      // Filter out notes that already exist
      const filteredNotes = action.newNotes.filter(note => !existingIds.has(note.id));
      // Return updated state
      return {
        ...state,
        notes: [...state.notes, ...filteredNotes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      };
    }
    case "ADD_NOTE": {
      console.debug("ADD_NOTE");
      if (action.role === undefined || action.content === undefined) {
        console.error("Operation ADD_NOTE requires {role, content} attribute");
        return state;
      }
      const id = action.id ? action.id : uuid();
      const offset = new Date().getTimezoneOffset();
      const localTime = new Date(new Date().getTime() - offset * 60000).toISOString();
      const note: Note = {
          id,
          content: action.content,
          created_at: localTime,
          role: action.role,
          knowledge_base: action.knowledge_base,
          hide: false,
          is_deleted: false,
          last_updated: localTime,
      }
      // Insert into indexDB
      if(state.user) state.indexedDB?.put(`notes-${state.user.id}`, note);
      // Insert into supabase
      upsertNote(note)
      return {
          ...state,
          notes: [...state.notes, note].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    }
    case "UPDATE_NOTE": {
      console.debug("UPDATE_NOTE");
      if (action.id === undefined || action.content === undefined) {
        console.error("Operation UPDATE_NOTE requires {id, content} attribute");
        return state;
      }
      const newNotes = state.notes
          .map((n) => (n.id === action.id ? { ...n, content: action.content, knowledge_base: action.knowledge_base ? action.knowledge_base : n.knowledge_base, hide: action.hide ? action.hide : n.hide } : n)) // Update the element
          .filter((n) => n.id !== action.id); // Remove the updated element from its current position
      const updatedNote = state.notes.find((n) => n.id === action.id); // Find the updated element
      if (updatedNote) {
          updatedNote.content = action.content;
          if(action.knowledge_base) updatedNote.knowledge_base = action.knowledge_base;
          if(action.hide) updatedNote.hide = action.hide;
          newNotes.push(updatedNote); // Move the updated element to the end
      }
      if (!updatedNote) return state;
      // Update indexDB
      if(state.indexedDB && state.user) state.indexedDB.put(`notes-${state.user.id}`, updatedNote)
      // Update supabase
      upsertNote(updatedNote);
      return {
          ...state,
          notes: newNotes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    }
    case "UPSERT_NOTE": {
      console.debug("UPSERT_NOTE");
  
      if (action.note === undefined) {
          console.error("Operation UPSERT_NOTE requires {note} attribute");
          return state;
      }
      // Update state
      const newNotes = state.notes
          .filter((n) => n.id !== action.note.id)
          .concat(action.note)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Update IndexedDB
      if(state.user) state.indexedDB?.put(`notes-${state.user.id}`, action.note)
      // Update Supabase
      upsertNote(action.note);
      return {
          ...state,
          notes: newNotes,
      };
    }
    case "DELETE_NOTE": {
        console.debug("DELETE_NOTE");
        if (action.id === undefined) {
          console.error("Operation DELETE_NOTE requires {id} attribute");
          return state;
        }
        const updatedNotes = state.notes.filter((n) => n.id !== action.id);
        deleteNote(action.id);
        if(state.indexedDB) state.indexedDB.delete('notes', action.id);
        return {
            ...state,
            notes: updatedNotes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        }
    }
    case "SET_EDITING": {
      console.debug("SET_EDITING");
      if (action.note === undefined) {
        console.error("Operation SET_EDITING requires {note} attribute");
        return state;
      }
      return {
        ...state,
        editingNote: action.note
      }
    }
    case "SET_DELETING": {
      console.debug("SET_DELETING");
      if (action.note === undefined) {
        console.error("Operation SET_DELETING requires {note} attribute");
        return state;
      }
      return {
        ...state,
        deletingNote: action.note
      }
    }
    default:
      console.log(`Unknown action type: ${action.type}`)
      return state;
  }
};

export default reducer;

