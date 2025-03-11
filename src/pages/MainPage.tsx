import React, { useState, useEffect, useRef } from 'react';
import {v4 as uuid} from 'uuid';
import { hybridSearch, searchNotesByPrefix } from '../api/search';
import { FaRegUserCircle } from "react-icons/fa";
import '../App.css';
import { Note } from '../types';
import NoteEdit from '../components/NoteEdit/NoteEdit';
import NoteChat from '../components/NoteChat/NoteChat';
import { Suggestion } from '../components/NoteChat/components';
import { TbSettings } from "react-icons/tb";
import KnowledgeBase from '../components/KnowledgeBase/KnowledgeBase';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IoIosClose } from "react-icons/io";
import { useProvider } from '../StateProvider';
import DeleteConfirmationPopup from '../components/DeleteConfirmationPopup';
import { fetchNotes, upsertNote } from '../api/notes';
import { getNotesFromLocalStorage, upsertNoteToLocalStorage } from '../utility/localstoarge';
import { chatWithNotes, getEmbedding } from '../api/openai';
import { NotificationManager } from '../utility/notification';

export function MainPage () {
  const [editing, setEditing] = useState<Note | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [noteSuggestions, setNoteSuggestions] = useState<Note[]>([]);
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isSyncing, setSyncing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [{ notes, user }, dispatch] = useProvider();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if (!session?.user || session?.user?.id === user?.id) return; 
        init();
        console.log('User signed in:', session?.user);
        dispatch({
          type: "SET_USER",
          user: session?.user
        });
        const url = new URL(window.location.href);
        const authSuccess = url.searchParams.get("auth");
        if (authSuccess === "success") {
            console.log("Authentication successful, closing window...");
            window.close(); // Close the popup or tab
        }
      } else if (event == 'SIGNED_OUT') {
        console.log('User signed out');
        init();
        dispatch({
          type: "SET_USER",
          user: null
        });
      } 
    });
    return () => data.subscription.unsubscribe();  
  }, [])

  /**
   * Reset states
   */
  const init = async () => {
    setSyncing(false)
    setEditing(null);
    setNoteSuggestions([]);
    setCommandSuggestions([]);
    setInput('');
    dispatch({
      type: "SET_NOTES",
      newNotes: []
    });
  }

  /**
   * Update notes and user info
   */
  const update = async () => {
    init();
    dispatch({
      type: "FETCH_INITIAL_NOTES",
    })
    if(notes && containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    await syncNotes();
    const dbNotes = await fetchNotes();
    dispatch({
      type: "SET_NOTES",
      newNotes: dbNotes
    })
    if(containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }

  const syncNotes = async () => {
    // Load notes from local storage and Supabase
    const localNotes = getNotesFromLocalStorage(user);
    const supabaseNotes = await fetchNotes();

    // Create a map for easier comparison
    const localNotesMap = new Map(localNotes.map(n => [n.id, n]));
    const supabaseNotesMap = new Map(supabaseNotes.map(n => [n.id, n]));

    // Compare and synchronize
    for (const [id, localNote] of localNotesMap) {
        const supabaseNote = supabaseNotesMap.get(id);

        if (!supabaseNote || new Date(localNote.created_at) > new Date(supabaseNote.created_at)) {

        if(localNote.role == 'user') {
            upsertNote({...localNote});
        }
        } else if (new Date(localNote.created_at) < new Date(supabaseNote.created_at)) {
        // Supabase note is newer
        upsertNoteToLocalStorage(user, supabaseNote);
        }
    }

    // Handle notes that are only in Supabase
    for (const [id, supabaseNote] of supabaseNotesMap) {
        if (!localNotesMap.has(id)) {
            upsertNoteToLocalStorage(user, supabaseNote);
        }
    }
  }

  const handleChat = async (input: string) => {
    const id = uuid();
    dispatch({
      type: "ADD_NOTE",
      id,
      role: "assistant",
      content: "",
    })
    const embedding = await getEmbedding(input);
    const data = await hybridSearch(input, embedding);
    const response = await chatWithNotes(input, data.map(note => `${note.content} (updated: ${note.created_at})`).join(','));
    if(!response) return;
    if(response.function_call) {
      const functionName = response.function_call.name;
      const functionArgs = JSON.parse(response.function_call.arguments);
      console.log(`functionArgs: ${JSON.stringify(functionArgs)}`);
      const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString(); // Adjust based on locale
      };
      if (functionName === 'setReminder') {
        try {
          await setReminder(functionArgs.message, functionArgs.reminderTime);
          console.log(143)
          dispatch({
            type: "UPDATE_NOTE",
            id,
            content: `Set a reminder for ${functionArgs.message} at ${formatDate(functionArgs.reminderTime)}`,
            knowledge_base: data
          })
        } catch {
          dispatch({
            type: "UPDATE_NOTE",
            id,
            content: `Error setting reminder`,
            knowledge_base: data
          })
        }
      }
    }
    console.log(`response.content: ${response.content}`)
    if(response.content) {
      dispatch({
        type: "UPDATE_NOTE",
        id,
        content: response.content,
        knowledge_base: data
      })
    }
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          dispatch({
            type: "ADD_NOTE",
            role: "user",
            content: input.trim(),
          })
          if(containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
          await handleChat(input.trim());
          setEditing(null); // Close note editor
        } else {
          dispatch({
            type: "ADD_NOTE",
            role: "user",
            content: input,
          })
          if(containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
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

  // Update notes and user info when user changes
  useEffect(() => {
    update();
  }, [user]);

  const [deletingNote, setDeletingNote] = useState<Note|null>(null); // Delete confirmation note

  const navigate = useNavigate();

  const handleOpenSetting: React.MouseEventHandler = (e) => {
    e.preventDefault();

    navigate("/setting");
  };  

  const [showKnowledgeBase, setShowKnowledgeBase] = useState<{content: string, knowledgeBase: string[]} | null>(null);

  const Syncing = () => {
    return (
      <div className='whitespace-nowrap text-[#888888]'>
        Syncing Data...
      </div>
    );
  };

  // TODO: Need to change to inline
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

  useEffect(() => {
    const subscription = supabase
      .channel("notes") // Channel name (can be any unique string)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes" }, (payload) => {
        dispatch({
          type: "UPDATE_NOTE",
          id: payload.new.id, // Ensuring we use latest state
          content: payload.new.content
        });
      })
      .subscribe();
  
    return () => {
      subscription.unsubscribe(); // Proper cleanup
    };
  }, [dispatch]);

  const setReminder = async (message: string, reminderTime: string) => {
    console.log(`setReminder: message: ${message}, reminderTime: ${reminderTime}`)
    try {
      const reminderId = await NotificationManager.setReminder(
        message,                 // Message content
        reminderTime            // Time as Date string
      );
      console.log('Reminder set with ID:', reminderId);
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  return (
    <div 
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
      }}>
      {editing && <NoteEdit 
            content={editing.content} 
            confirmDelete={() => setDeletingNote(editing)}
            onChange={async (e) => {
              const value = e.target.value;
              // Update locally
              dispatch({
                type: "UPDATE_NOTE",
                id: editing.id,
                content: value
              })
            }} 
            close={() => {setEditing(null)}}
          />}
      { deletingNote !== null ? 
        <DeleteConfirmationPopup 
          note={deletingNote!} 
          onDelete={()=>{
            dispatch({
              type: "DELETE_NOTE",
              id: deletingNote!.id,
            })
            setDeletingNote(null);
            setEditing(null);
          }}
          onCancel={()=>setDeletingNote(null)}
          /> : null }
      {showKnowledgeBase && <KnowledgeBase 
            content={showKnowledgeBase.content} 
            knowledgeBase={showKnowledgeBase.knowledgeBase}
            close={() => setShowKnowledgeBase(null)}
          />}
      <div className='flex justify-start items-start w-full'>
        <div className="flex flex-col h-[100vh] w-full bg-[#212121]">
        <div 
          ref={containerRef}
          className="pt-3 pb-5 flex-grow overflow-auto flex flex-col scrollbar scrollbar-thumb-blue-500 scrollbar-track-gray-300">
          <NoteChat 
            notes={notes}
            onNoteClick={(note) => {setEditing(note)}} 
            onNoteChange={async (id: string, content: string) => {
              dispatch({
                type: "UPDATE_NOTE",
                id,
                content
              })
            }}
            openKnowledgeBase={(content, knowledgeBase) => {
              const knowledgeBaseStr: string[] = []
              for (let i=0; i<knowledgeBase.length; i++) {
                const note = notes.find(n => n.id == knowledgeBase[i].id);
                if (note) {
                  knowledgeBaseStr.push(`${note.content}\n\n[S: ${knowledgeBase[i].similarity}]`)
                }
              }
              setShowKnowledgeBase({content, knowledgeBase: knowledgeBaseStr})
            }}/>
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
          <div className='flex p-3 items-center'>
            { isSyncing ? <Syncing /> : null}
            <div className='w-full'/>
            <div className='flex flex-none items-center gap-2'>
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
                  width={28} height={28}
                  onClick={handleOpenOnboarding}
                />
              }
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}