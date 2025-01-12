import React, { useState, useEffect, useRef } from 'react';
import { addNote, fetchNotes, updateNote, upsertNote } from '../api/notes';
import {v4 as uuid} from 'uuid';
import { hybridSearch, searchNotesByPrefix } from '../api/search';
import generateEmbedding, { chatWithNotes } from '../api/openai';
import ReactMarkdown from 'react-markdown';
import { IoIosArrowBack } from "react-icons/io";
import { FaRegUserCircle } from "react-icons/fa";
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import '../App.css';

export type Message = {
  id: string;
  content: string;
  created_at: string; // ISO date string
  role: string;
  last_updated: string;
  embedding: number[];
};

export function MainPage() {
  const [editing, setEditing] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const sidePanelStyle = {
    height: '100vh', // Full viewport height
    backgroundColor: "#212121",
  };

  const update = async () => {
    setMessages(await fetchNotes());
    // User picture
    if (user) {
      const picture = user.user_metadata.avatar_url || user.user_metadata.picture;
      setProfilePicture(picture || null);
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    update();
  }, [user]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight; // Scroll to the bottom
    }
  }, [editing, messages])

  async function handleAddNote(role: string, content: string) {
    const id = uuid();
    const created_at = new Date().toISOString();
    const last_updated = new Date().toISOString();
    const embedding = await generateEmbedding(content);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id,
        content,
        created_at,
        embedding,
        role,
        last_updated
      },
    ]);
    await addNote({
      role,
      content,
      embedding
    });
  }

  const getNotesFromLocalStorage = (): Message[] => {
    const notes = localStorage.getItem("notes");
    return notes ? JSON.parse(notes) : [];
  };

  const saveToLocalStorage = (notes: Message[]) => {
    localStorage.setItem("notes", JSON.stringify(notes));
  };

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
    
    const updatedLocalNotes: Message[] = [];

    // Compare and synchronize
    for (const [id, localNote] of localMap) {
      const supabaseNote = supabaseMap.get(id);

      if (!supabaseNote || new Date(localNote.last_updated) > new Date(supabaseNote.last_updated)) {
        // Local note is newer or does not exist in Supabase
        // Update or insert to supabase
        upsertNote({id: localNote.id, content: localNote.content, role: localNote.role, embedding: localNote.embedding});
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

  useEffect(() => {
    syncNotes();
  }, [])

  async function handleUpdateNote(id: string, content: string, embedding: number[]) {
    // Update state
    const newMessages = messages.map((m) =>
      m.id === id ? { ...m, content: content } : m
    );
    setMessages(newMessages);
    // Store in local storage to prevent data lost
    const storedData = localStorage.getItem("pendingNotes");
    const pendingNotes = storedData ? JSON.parse(storedData) : [];
    pendingNotes.push({id, role: "user", content, embedding});
    // Store in supabase
    updateNote(id, content, embedding);
  }

  /* async function updateNote(id: string, content: string) {
    const response = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content }),
    });

    if (!response.ok) {
      alert('Error updating note');
    }
  }

  async function deleteNote(id: string) {
    const response = await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      alert('Error deleting note');
    }
  } */

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

  const [noteSuggestions, setNoteSuggestions] = useState<Message[]>([]);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const input = (e.target as HTMLInputElement).value;
    setInput(input);
    const commands = [
      '/open <note-name>'
    ]
    if (input.startsWith('/open ') && input.length >= 7) {
      const target = input.substring(6);
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

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if(!session?.user) return;
        console.log('User signed in:', session?.user);
        setUser(session?.user);
      }
    });
    
    // To unsubscribe:
    return () => data.subscription.unsubscribe();    
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    
    if (status === 'signed_in') {
      console.log('User has just signed up!');
      // Handle signed-in status
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.status === 'signed_in') {
        console.log('User has signed up:', event.data.user);
        setUser(event.data.user || null);
        // Handle signed-in user, e.g., update UI
      }
    };
  
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const [input, setInput] = useState('');

  return (
    <div className='flex justify-start items-start w-full'>
      <div style={sidePanelStyle} className="flex flex-col h-full w-full">
      <div 
        ref={containerRef}
        className="pt-3 pb-5 flex-grow overflow-auto flex flex-col scrollbar scrollbar-thumb-blue-500 scrollbar-track-gray-300">
        {editing ? 
          <NoteEdit content={editing.content} onChange={async (e) => {
            const value = e.target.value;
            const embedding = await generateEmbedding(value);
            handleUpdateNote(editing.id, value, embedding);
          }} close={() => {setEditing(null)}}/> : 
          <NoteChat messages={messages} onNoteClick={(note) => {setEditing(note)}}/>}
      </div>
      {
        noteSuggestions.length > 0 || commandSuggestions.length > 0 ? 
        <div className='w-full absolute bottom-0 left-0 p-3 pb-11'>
          <div className='flex flex-col rounded-lg overflow-hidden' style={{ backgroundColor: "#2f2f2f"}}>
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

const Suggestion = ({text, onClick}: {text: string, onClick: () => void}) => {
  return (
    <div 
      className='p-2 pl-3 pr-3 suggestion cursor-pointer' 
      onClick={onClick}>
      {text}
    </div>
  )
}

type MessageProps = {
  key: string;
  content: string;
};

const AssistantMessage = ({content}: MessageProps) => {
  return (
    <div className='flex'>
      <div className='w-2'>
        <div style={{ width: "4px", height: "100%", backgroundColor: "#525252"}} />
      </div>
      <div className="p-2 pt-2 pb-2 w-full">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

const UserMessage = ({content, onClick}: {content: string, onClick: () => void}) => {
  return (
    <div className="markdown p-4 pt-2 pb-2 w-full user-message cursor-pointer" onClick={onClick}>
      <ReactMarkdown
        
      >{content}</ReactMarkdown>
    </div>
  )
}

const NoteChat = ({messages, onNoteClick}: {messages: Message[], onNoteClick: (m: Message) => void}) => {
  return <>
    {
      messages.map((m) => {
        if (m.role == 'user') {
          return <UserMessage key={uuid()} content={m.content} onClick={() => onNoteClick(m)}/>
        } 
        if (m.role == 'assistant') {
          return <AssistantMessage key={uuid()} content={m.content} />
        }
      })
    }
  </>
}

const NoteEdit = ({content, onChange, close}: {content: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, close: () => void}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState<string>(content);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus(); // Autofocus
      textareaRef.current.selectionStart = textareaRef.current.value.length; // Set cursor position to the end
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, []);
  
  return (
    <div className='flex flex-col h-full'>
      <IoIosArrowBack className='m-1 ml-3 mb-0 cursor-pointer' onClick={() => close()} size={22}/>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const updatedValue = e.target.value;
          setValue(updatedValue);
          onChange(e);
        }}
        placeholder='tesrt'
        className='h-full bg-transparent focus:outline-none p-4 pt-2 pb-2'
        style={{
          boxSizing: 'border-box',
          resize: 'none',
        }}
      />
    </div>
  )
}