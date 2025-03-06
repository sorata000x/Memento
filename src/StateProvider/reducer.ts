import { User } from "@supabase/supabase-js";
import { deleteNote, updateNote, upsertNote } from "../api/notes";
import { getEmbedding } from "../api/openai";
import { Note } from "../types";
import { getNotesFromLocalStorage, upsertNoteToLocalStorage } from "../utility/localstoarge";
import {v4 as uuid} from 'uuid';

export interface StateData {
  notes: Note[];
  user: User | null;
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
}

// Get initial state from local storage or set to empty
const getInitialState = (): StateData => {
  return {
    user: null,
    notes: []
  }
};

export const initialState: StateData = getInitialState();

const reducer = (state: StateData, action: StateAction): StateData => {
  switch (action.type) {
    case "SET_USER": {
      console.debug("SET_USER");
      if (action.user === undefined) {
        console.error("Operation SET_USER requires {user} attribute");
        return state;
      }
      return {
        ...state,
        user: action.user
      }
    }
    case "FETCH_INITIAL_NOTES": {
      console.debug("FETCH_INITIAL_NOTES");
      const localNotes = getNotesFromLocalStorage(state.user);
      return {
        ...state,
        notes: localNotes
      };
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
        notes: action.newNotes
      }
    }
    case "ADD_NOTES": {
      console.debug("ADD_NOTES");
      console.log(`action.newNotes: ${JSON.stringify(action.newNotes)}`)
      if (action.newNotes === undefined) {
        console.error("Operation ADD_NOTES requires {newNotes} attribute");
        return state;
      }
      return {
        ...state,
        notes: [...state.notes, ...action.newNotes]
      }
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
        const created_at = localTime;
        const note: Note = {
            id,
            content: action.content,
            created_at,
            embedding: [],
            role: action.role,
            knowledge_base: action.knowledge_base
        }
        upsertNoteToLocalStorage(state.user, note);
        const updateDBNotes = async () => {
          const embedding = await getEmbedding(action.content);
          await upsertNote({id, role: action.role, content: action.content, embedding, created_at});
        }
        updateDBNotes();
        return {
            ...state,
            notes: [...state.notes, note]
        }
    }
    case "UPDATE_NOTE": {
        console.debug("UPDATE_NOTE");
        if (action.id === undefined || action.content === undefined) {
          console.error("OperationADD_NOTE requires {id, content} attribute");
          return state;
        }
        const newNotes = state.notes
            .map((n) => (n.id === action.id ? { ...n, content: action.content, knowledge_base: action.knowledge_base ? action.knowledge_base : n.knowledge_base } : n)) // Update the element
            .filter((n) => n.id !== action.id); // Remove the updated element from its current position
        const updatedNote = state.notes.find((n) => n.id === action.id); // Find the updated element
        if (updatedNote) {
            updatedNote.content = action.content;
            if(action.knowledge_base) updatedNote.knowledge_base = action.knowledge_base;
            newNotes.push(updatedNote); // Move the updated element to the end
        }
        if (!updatedNote) return state;
        upsertNoteToLocalStorage(state.user, updatedNote)
        const updateDBNotes = async () => {
          const embedding = await getEmbedding(action.content);
          await updateNote(action.id, action.content, embedding, action.knowledge_base);
        }
        updateDBNotes();
        return {
            ...state,
            notes: newNotes
        }
    }
    case "DELETE_NOTE": {
        console.debug("DELETE_NOTE");
        const updatedNotes = state.notes.filter((n) => n.id !== action.id);
        deleteNote(action.id);
        localStorage.setItem(state.user?.id || "guest", JSON.stringify(updatedNotes));
        return {
            ...state,
            notes: updatedNotes
        }
    }
    default:
      console.log(`Unknown action type: ${action.type}`)
      return state;
  }
};

export default reducer;

