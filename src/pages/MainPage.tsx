import React, { useState, useEffect, useRef } from 'react';
import { addNote, deleteNote, fetchNotes, updateNote, upsertNote } from '../api/notes';
import {v4 as uuid} from 'uuid';
import { hybridSearch, searchNotesByPrefix } from '../api/search';
import generateEmbedding, { chatWithNotes } from '../api/openai';
import { FaRegUserCircle } from "react-icons/fa";
import { User } from '@supabase/supabase-js';
import '../App.css';
import { Note, Response } from '../types';
import NoteEdit from '../components/NoteEdit/NoteEdit';
import NoteChat from '../components/NoteChat/NoteChat';
import { Suggestion, UserNote } from '../components/NoteChat/components';
import { TbSettings } from "react-icons/tb";
import { addResponses, fetchResponses } from '../api/responses';
import KnowledgeBase from '../components/KnowledgeBase/KnowledgeBase';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { addNoteToLocalStorage } from "../utility/localstoarge";
import CircularProgress from "@mui/material/CircularProgress";
import { IoIosClose } from "react-icons/io";

export function MainPage ({user, setUser}: {user: User | null, setUser: (user: User | null) => void}) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [noteSuggestions, setNoteSuggestions] = useState<Note[]>([]);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: suser } } = await supabase.auth.getUser();
      if (suser && user != suser) {
        setUser(suser);
      } 
    };
    fetchUser();
    // Listen to user change
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            if (!session?.user || session?.user?.id === user?.id) return; 
            const suser = session?.user;
            if(!suser) return;
            console.log('User signed in:', session?.user);
            setUser(suser);
        } else if (event == 'SIGNED_OUT') {
            console.log('User signed out');
            setUser(null);
        } 
    });
    return () => data.subscription.unsubscribe();  
  }, []);

  const init = async () => {
    setEditing(null);
    setNotes([]);
    setNoteSuggestions([]);
    setCommandSuggestions([]);
    setInput('');
    setResponses([]);
  }

  /**
   * Update notes and user info
   */
  const update = async () => {
    if (user) setLoading(true);
    init();
    await handleFetchNote();
    await handleFetchResponses();
    setLoading(false);
  }

  /* Note Functions */

  async function handleFetchNote() {
    let fetchedNotes: Note[];
    if(user) {
      await syncNotes();
      fetchedNotes = await fetchNotes();
    } else {
      fetchedNotes = getNotesFromLocalStorage();
    }
    setNotes(fetchedNotes);
  }

  async function handleAddNote(role: string, content: string, file_paths: string[]) {
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
        last_updated,
        file_paths,
      },
    ]);
    // Store in local storage to prevent data lost
    const storedData = localStorage.getItem(user?.id || "guest");
    const localNotes = storedData ? JSON.parse(storedData) : [];
    localNotes.push({id, role: "user", content, embedding, last_updated});
    // Store in database
    await addNote({
      role,
      content,
      embedding,
      filePaths: file_paths
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
    const storedData = localStorage.getItem(user?.id || "guest");
    const storedNotes = storedData ? JSON.parse(storedData) : [];
    storedNotes.push({id, role: "user", content, embedding, last_updated: updateTime});
    // Store in supabase
    updateNote(id, content, embedding, updateTime);
  }

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    // Update local storage
    localStorage.setItem(user?.id || "guest", JSON.stringify(updatedNotes));
    // Update supabase
    deleteNote(id);
  }

  /* Note Syncing */

  const getNotesFromLocalStorage = (): Note[] => {
    const notes = localStorage.getItem(user?.id || "guest");
    return notes ? JSON.parse(notes) : [];
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

    // Compare and synchronize
    for (const [id, localNote] of localMap) {
      const supabaseNote = supabaseMap.get(id);

      if (!supabaseNote || new Date(localNote.last_updated) > new Date(supabaseNote.last_updated)) {
        // Local note is newer or does not exist in Supabase
        // Update or insert to supabase
        upsertNote({id: localNote.id, content: localNote.content, role: localNote.role, embedding: localNote.embedding, last_updated: localNote.last_updated});
      } else if (new Date(localNote.last_updated) < new Date(supabaseNote.last_updated)) {
        // Supabase note is newer
        addNoteToLocalStorage(supabaseNote);
      }
    }

    // Handle notes that are only in Supabase
    for (const [id, supabaseNote] of supabaseMap) {
      if (!localMap.has(id)) {
        addNoteToLocalStorage(supabaseNote);
      }
    }
  }

  /* Responses Functions */

  async function handleFetchResponses() {
    if(user) {
      setResponses(await fetchResponses());
    }
  }

  async function handleAddResponse(id: string, content: string, knowledge_base: {id: string, similarity: number}[]) {
    const created_at = new Date().toISOString();
    const embedding = await generateEmbedding(content);
    setResponses((prev) => [
      ...prev.slice(0, -1),
      {
        id,
        content,
        embedding,
        created_at,
        knowledge_base,
      },
    ]);
    // Store in database
    await addResponses({
      content,
      embedding,
      knowledge_base,
    });
  }

  async function handleHybridSearch(query: string) {
    const embedding = await generateEmbedding(query);
    const data = await hybridSearch(query, embedding);
    return data;
  }  

  async function handleChat(input: string) {
    const id = uuid();
    setResponses((prev) => [
      ...prev,
      {
        id,
        content: "",
        embedding: [],
        created_at: new Date().toISOString(),
        knowledge_base: [],
      },
    ]);
    const data = await handleHybridSearch(input);
    const response = await chatWithNotes(input, notes);
    if(!response) return;
    handleAddResponse(id, response, data);
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
    if (e.key === "Enter" && !isComposing) {
      const input = (e.target as HTMLInputElement).value; // Cast e.target
      const tfiles = files.map(f => f.path);
      setInput("");
      setFiles([]);
      if (input) {
        // Command
        if (input.startsWith('/open ')) {
          setEditing(noteSuggestions[noteSuggestions.length-1]);
          setNoteSuggestions([]);
          setCommandSuggestions([]);
        }
        else if (input.startsWith(' ')) {
          // Search notes if first two characters are spaces
          await handleAddNote('user', input.trim(), tfiles);
          await handleChat(input.trim());
          setEditing(null); // Close note editor
        } else {
          await handleAddNote('user', input, tfiles);
          setEditing(null); // Close note editor
        }
        //(e.target as HTMLInputElement).value = ""; // Clear the input field
      }
    }
  };  

  const handleOpenOnboarding: React.MouseEventHandler = async (e) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      console.log('Successfully logged out!');
    }

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

  /*useEffect(() => {
    syncNotes();
  }, [])*/

  // Update notes and user info when user changes
  useEffect(() => {
    update();
  }, [user]);

  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 1); // Small delay ensures DOM is updated
    }
  }, [editing, notes]);

  const DeleteConfirmationPopup = ({note, onDelete, onCancel}: {note: Note, onDelete: () => void, onCancel: () => void}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          onCancel();
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
  
      // Cleanup the event listener
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [onCancel]);
    
    return <div ref={ref} className='flex items-center justify-center h-[100vh] w-[100vw] bg-black bg-opacity-50 absolute'>
      <div className='flex flex-col w-[16rem] bg-[#212121] p-3 rounded-md'>
        <h1 className='text-base font-semibold'>Delete Note</h1>
        <p className='py-2'>Are you sure you want to delete this note?</p>
        <div className='border border-[#515151] rounded-md my-3 mb-6'>
          <UserNote content={note.content} filePaths={note.file_paths} />
        </div>
        <div className='grow'/>
        <div className='flex justify-end font-semibold'>
          <button onClick={()=>onCancel()} className='px-6 bg-transparent'>
            Cancel
          </button>
          <button onClick={()=>onDelete()} className='px-4 py-1 m-0 bg-red-600 hover:bg-red-900'>
            Delete
          </button>
        </div>
      </div>
    </div>
  }

  const [deletingNote, setDeletingNote] = useState<Note|null>(null); // Delete confirmation note

  const navigate = useNavigate();

  const handleOpenSetting: React.MouseEventHandler = (e) => {
    e.preventDefault();

    navigate("/setting");
  };  

  const [showKnowledgeBase, setShowKnowledgeBase] = useState<{content: string, knowledgeBase: string[]} | null>(null);

  const Loading = () => {
    return (
      <div className="flex justify-center items-center h-screen absolute bg-[#212121] w-full">
        <CircularProgress style={{ color: "white" }}/>
      </div>
    );
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file && user) {
      const id = uuid();
      const sanitizedFileName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9.-]/g, "");
      const path = `${user.id}/${id}/${sanitizedFileName}`;
      let url = '';

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("files")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (error) {
        console.error("Upload error:", error);
        return;
      }

      const { data: urlData } = await supabase.storage
        .from("files")
        .createSignedUrl(`${user.id}/${id}/${sanitizedFileName}`, 60 * 60 * 24);

      if (urlData) url = urlData.signedUrl;

      setFiles((prev) => [...prev, {name: file.name, path, url}]);
    }
  };

  const [files, setFiles] = useState<{name: string, path: string, url: string}[]>([]);

  return (
    <div onDrop={handleDrop}
    onDragOver={(event) => {
      event.preventDefault();
    }}>
      { isLoading ? <Loading /> : null}
      { deletingNote !== null ? 
        <DeleteConfirmationPopup 
          note={deletingNote!} 
          onDelete={()=>{
            handleDeleteNote(deletingNote!.id);
            setDeletingNote(null);
            setEditing(null);
          }}
          onCancel={()=>setDeletingNote(null)}
          /> : null }
      <div className='flex justify-start items-start w-full'>
        <div className="flex flex-col h-[100vh] w-full bg-[#212121]">
        <div 
          ref={containerRef}
          className="pt-3 pb-5 flex-grow overflow-auto flex flex-col scrollbar scrollbar-thumb-blue-500 scrollbar-track-gray-300">
          {editing && <NoteEdit 
            content={editing.content} 
            confirmDelete={() => setDeletingNote(editing)}
            onChange={async (e) => {
              const value = e.target.value;
              const embedding = await generateEmbedding(value);
              handleUpdateNote(editing.id, value, embedding);
            }} 
            close={() => {setEditing(null)}}
          />}
          {showKnowledgeBase && <KnowledgeBase 
            content={showKnowledgeBase.content} 
            knowledgeBase={showKnowledgeBase.knowledgeBase}
            close={() => setShowKnowledgeBase(null)}
          />}
          {!editing && !showKnowledgeBase && 
            <NoteChat 
              notes={notes} 
              responses={responses}
              onNoteClick={(note) => {setEditing(note)}} 
              openKnowledgeBase={(content, knowledgeBase) => {
                const knowledgeBaseStr: string[] = []
                for (let i=0; i<knowledgeBase.length; i++) {
                  const note = notes.find(n => n.id == knowledgeBase[i].id);
                  if (note) {
                    knowledgeBaseStr.push(`${note.content}\n\n[S: ${knowledgeBase[i].similarity}]`)
                  }
                }
                setShowKnowledgeBase({content, knowledgeBase: knowledgeBaseStr})
              }}/>}
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
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                />
            </div>
          </div>
          : null
        }
        {
          files.length > 0 ? 
          <div className='w-full absolute bottom-[5rem] left-0 p-3 overflow-hidden'>
            <div className='flex flex-col rounded-lg border-b' style={{ backgroundColor: "#2f2f2f"}}>
              <div className='flex rounded-lg overflow-scroll gap-3 p-3'>
              {files.map((file, index) => (
                <div key={index} className="flex flex-col p-2 rounded-md bg-[#212121] max-w-[10rem] max-h-[10rem] relative justify-between gap-1">
                  <IoIosClose 
                    className='absolute right-0 bg-black top-0 transform translate-x-[20%] -translate-y-[20%] rounded-full cursor-pointer' 
                    size={30}
                    onClick={()=>setFiles((prev) => prev.filter((_, i) => i !== index))}/>
                  {file.name.endsWith(".jpg") || file.name.endsWith(".png") || file.name.endsWith(".jpeg") ? (
                    <div className='flex justify-center'>
                      <img src={file.url} alt={file.name} className="max-w-[9rem] max-h-[7rem] rounded-md"/>
                    </div>
                  ) : file.url.endsWith(".mp4") ? (
                    <video src={file.url} controls className="max-w-xs" />
                  ) : file.url.endsWith(".pdf") ? (
                    <embed src={file.url} type="application/pdf" className="max-w-xs" />
                  ) : (
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      Open File
                    </a>
                  )}
                  <p className='truncate'>{file.name}</p>
                </div>
              ))}
              </div>
            </div>
          </div>
          : null
        }
        <div className="p-3 pt-0 pb-0">
          <input 
            className="h-12 flex-shrink-0 w-full rounded-lg focus:outline-none p-3 text-sm"
            style={{backgroundColor: "#2f2f2f"}}
            value={input}
            onKeyDown={handleKeyDown}
            onChange={handleInputChange}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            />
          {/* Fake placeholder */}
          {input == ' ' && (
            <div
              className='absolute bottom-[3.2rem] left-[1.85rem] text-sm'
              style={{
                transform: 'translateY(-50%)',
                pointerEvents: 'none', // Ensure clicks pass through to the input
                color: '#888', // Placeholder-like color
              }}
            >
              Ask AI anything...
            </div>
          )}
          <div className='flex justify-end p-3 items-center gap-2'>
            <TbSettings
              className='cursor-pointer'
              onClick={handleOpenSetting}
              size={28}/>
            {user ? 
              <img
                className="rounded-full cursor-pointer"
                src={user.user_metadata.avatar_url} width={26} height={26}
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
    </div>
  );
}