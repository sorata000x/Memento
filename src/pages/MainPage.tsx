import React, { useState, useEffect, useRef } from 'react';
import { addNote, deleteNote, fetchNotes, updateNote, upsertNote } from '../api/notes';
import {v4 as uuid} from 'uuid';
import { hybridSearch, searchNotesByPrefix } from '../api/search';
import generateEmbedding, { chatWithNotes } from '../api/openai';
import { FaRegUserCircle } from "react-icons/fa";
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import '../App.css';
import { Note } from '../types';
import NoteEdit from '../components/NoteEdit/NoteEdit';
import NoteChat from '../components/NoteChat/NoteChat';
import { Suggestion } from '../components/NoteChat/components';

export function MainPage() {
  const [editing, setEditing] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [noteSuggestions, setNoteSuggestions] = useState<Note[]>([]);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');

  /**
   * Update notes and user info
   */
  const update = async () => {
    setNotes(await fetchNotes());
    // User picture
    if (user) {
      const picture = user.user_metadata.avatar_url || user.user_metadata.picture;
      setProfilePicture(picture || null);
    }
  }

  /* Note Functions */

  async function handleAddNote(role: string, content: string) {
    const id = uuid();
    const last_updated = new Date().toISOString();
    const embedding = await generateEmbedding(content);
    setNotes((prev) => [
      ...prev,
      {
        id,
        content,
        embedding,
        role,
        last_updated
      },
    ]);
    // Store in local storage to prevent data lost
    const storedData = localStorage.getItem("notes");
    const localNotes = storedData ? JSON.parse(storedData) : [];
    localNotes.push({id, role: "user", content, embedding, last_updated});
    // Store in database
    await addNote({
      role,
      content,
      embedding
    });
  }

  async function handleUpdateNote(id: string, content: string, embedding: number[]) {
    const updateTime = new Date().toISOString();
    // Update state
    const newNotes = notes
      .map((n) => (n.id === id ? { ...n, content: content, last_updated: updateTime } : n)) // Update the element
      .filter((n) => n.id !== id); // Remove the updated element from its current position

    const updatedNote = notes.find((n) => n.id === id); // Find the updated element
    if (updatedNote) {
      updatedNote.content = content;
      updatedNote.last_updated = updateTime;
      newNotes.push(updatedNote); // Move the updated element to the end
    }

    setNotes(newNotes);
    // Store in local storage to prevent data lost
    const storedData = localStorage.getItem("notes");
    const storedNotes = storedData ? JSON.parse(storedData) : [];
    storedNotes.push({id, role: "user", content, embedding, last_updated: updateTime});
    // Store in supabase
    updateNote(id, content, embedding, updateTime);
  }

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    // Update local storage
    localStorage.setItem("notes", JSON.stringify(updatedNotes));
    // Update supabase
    deleteNote(id);
  }

  /* Note Syncing */

  const getNotesFromLocalStorage = (): Note[] => {
    const notes = localStorage.getItem("notes");
    return notes ? JSON.parse(notes) : [];
  }

  const saveToLocalStorage = (notes: Note[]) => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }

  // * Notes are being stored both in local storage and supabase.
  // * To enable offline note taking as well as preventing data lost
  // * before being stored in supabase.
  // * So everytime app start will need to sync notes to the newest version.
  const syncNotes = async () => {
    // Load notes from local storage and Supabase
    const localNotes = getNotesFromLocalStorage();
    const supabaseNotes = await fetchNotes();
    
    // Create a map for easier comparison
    const localMap = new Map(localNotes.map(note => [note.id, note]));
    const supabaseMap = new Map(supabaseNotes.map(note => [note.id, note]));
    
    const updatedLocalNotes: Note[] = [];

    // Compare and synchronize
    for (const [id, localNote] of localMap) {
      const supabaseNote = supabaseMap.get(id);

      if (!supabaseNote || new Date(localNote.last_updated) > new Date(supabaseNote.last_updated)) {
        // Local note is newer or does not exist in Supabase
        // Update or insert to supabase
        upsertNote({id: localNote.id, content: localNote.content, role: localNote.role, embedding: localNote.embedding, last_updated: localNote.last_updated});
      } else if (new Date(localNote.last_updated) < new Date(supabaseNote.last_updated)) {
        // Supabase note is newer
        updatedLocalNotes.push(supabaseNote);
      }
    }

    // Handle notes that are only in Supabase
    for (const [id, supabaseNote] of supabaseMap) {
      if (!localMap.has(id)) {
        updatedLocalNotes.push(supabaseNote);
      }
    }

    // Save updates to local storage
    if (updatedLocalNotes.length > 0) {
      saveToLocalStorage([...localNotes, ...updatedLocalNotes]);
    }
  }

  async function handleHybridSearch(query: string) {
    const embedding = await generateEmbedding(query);
    const data = await hybridSearch(query, embedding);
    return data;
  }  

  async function handleChat(input: string) {
    const notes = await handleHybridSearch(input);
    const response = await chatWithNotes(input, notes);
    if(!response) return;
    handleAddNote('assistant', response)
  }

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const input = (e.target as HTMLInputElement).value;
    setInput(input);
    const commands = [
      '/open <note-name>'
    ]
    if (input.startsWith('/open ') && input.length >= 6) {
      const target = input.substring(6);
      if(target.length === 0) {
        setNoteSuggestions([]);
        return;
      }
      const matchedNotes = await searchNotesByPrefix(target);
      setNoteSuggestions(matchedNotes);
      setCommandSuggestions([]);
    } else if (input.startsWith('/')) {
      // Handle generic command matching case
      const matchingCommands = commands.filter(command => command.startsWith(input));
      setCommandSuggestions(matchingCommands);
    } else {
      setNoteSuggestions([]);
      setCommandSuggestions([]);
    }
  }

  function extractCommonPrefix(strings: string[]): string {
      if (strings.length === 0) return "";

      let prefix = strings[0]; // Start with the first string

      for (let i = 1; i < strings.length; i++) {
          while (strings[i].indexOf(prefix) !== 0) {
              prefix = prefix.slice(0, -1); // Trim the prefix from the end
              if (prefix === "") return ""; // If no common prefix, return empty string
          }
      }

      return prefix;
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Tab") {
      if (commandSuggestions.length > 0) {
        setInput(extractCommonPrefix(commandSuggestions));
      }
      if (noteSuggestions.length > 0) {
        const command = input.substring(0, input.indexOf(' ') + 1);
        const note = noteSuggestions[0].content;
        setInput(command + note);
      }
    } 
    if (e.key === "Enter") {
      const input = (e.target as HTMLInputElement).value; // Cast e.target
      if (input) {
        // Command
        if (input.startsWith('/open ')) {
          setEditing(noteSuggestions[noteSuggestions.length-1]);
          setNoteSuggestions([]);
          setCommandSuggestions([]);
        }
        else if (input.startsWith(' ')) {
          // Search notes if first two characters are spaces
          await handleAddNote('user', input.trim());
          handleChat(input.trim());
          setEditing(null); // Close note editor
        } else {
          handleAddNote('user', input);
          setEditing(null); // Close note editor
        }
        //(e.target as HTMLInputElement).value = ""; // Clear the input field
        setInput("");
      }
    }
  };  

  const handleOpenOnboarding: React.MouseEventHandler = (e) => {
    e.preventDefault();

    // Define the URL of the onboarding page
    const onboardingURL = chrome.runtime.getURL("onboarding.html");

    // Open a popup window
    window.open(
      onboardingURL,
      "onboarding", // Popup window name
      "width=400,height=600,scrollbars=yes,resizable=yes"
    );
  };

  useEffect(() => {
    syncNotes();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if(!session?.user) return;
        console.log('User signed in:', session?.user);
        setUser(session?.user);
      }
    });
    return () => data.subscription.unsubscribe();  
  }, [])

  // Update notes and user info when user changes
  useEffect(() => {
    update();
  }, [user]);

  // Scroll to the bottom by default
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [editing, notes])

  return (
    <div className='flex justify-start items-start w-full'>
      <div className="flex flex-col h-[100vh] w-full bg-[#212121]">
      <div 
        ref={containerRef}
        className="pt-3 pb-5 flex-grow overflow-auto flex flex-col scrollbar scrollbar-thumb-blue-500 scrollbar-track-gray-300">
        {editing ? 
          <NoteEdit 
            content={editing.content} 
            deleteNote={() => handleDeleteNote(editing.id)}
            onChange={async (e) => {
              const value = e.target.value;
              const embedding = await generateEmbedding(value);
              handleUpdateNote(editing.id, value, embedding);
            }} close={() => {setEditing(null)}}
            /> : 
          <NoteChat notes={notes} onNoteClick={(note) => {setEditing(note)}}/>}
      </div>
      {
        noteSuggestions.length > 0 || commandSuggestions.length > 0 ? 
        <div className='w-full absolute bottom-[2rem] left-0 p-3 overflow-hidden'>
          <div className='flex flex-col rounded-lg' style={{ backgroundColor: "#2f2f2f"}}>
            <div className='flex flex-col rounded-lg overflow-scroll max-h-[calc(100vh-10rem)]'>
              {noteSuggestions.map(note => <Suggestion text={note.content} onClick={() => {
                setEditing(note);
                setNoteSuggestions([]);
                setInput('');
              }}/>)}
              {commandSuggestions.map(command => <Suggestion text={command} onClick={() => {
                // Only keep the command part
                setInput(command.substring(0, command.indexOf(' ')+1));
                setCommandSuggestions([]);
              }}/>)}
            </div>
            <input 
              className='w-full bg-transparent h-12 rounded-b-lg focus:outline-none p-3'
              value={input}
              onKeyDown={handleKeyDown}
              onChange={handleInputChange}
              />
          </div>
        </div>
        : null
      }
      <div className="p-3 pt-0 pb-0">
        <input 
          className="h-12 flex-shrink-0 w-full rounded-lg focus:outline-none p-3"
          style={{backgroundColor: "#2f2f2f"}}
          value={input}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          />
        <div className='flex justify-end p-3'>
          {profilePicture ? 
            <div
              className="h-5 w-5 rounded-full cursor-pointer bg-cover bg-center" 
              style={{backgroundImage: `url(${profilePicture})`}}
              onClick={handleOpenOnboarding}
              />
            :
            <FaRegUserCircle 
              className="h-5 w-5 rounded-full cursor-pointer" 
              onClick={handleOpenOnboarding}
            />
          }
        </div>
      </div>
    </div>
    </div>
  );
}