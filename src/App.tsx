import './App.css'
import React, { useState, useEffect, useRef } from 'react';
import { addNote, fetchNotes, updateNote } from './api/notes';
import {v4 as uuid} from 'uuid';
import { hybridSearch } from './api/search';
import generateEmbedding, { chatWithNotes } from './api/openai';
import ReactMarkdown from 'react-markdown';
import { IoIosArrowBack } from "react-icons/io";

type Message = {
  id: string;
  content: string;
  created_at: string; // ISO date string
  role: string;
};

function App() {
  const [editing, setEditing] = useState<Message | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const sidePanelStyle = {
    width: '360px', // Set the width to match Chrome's side panel size
    height: '100vh', // Full viewport height
    backgroundColor: "#212121",
  };

  const update = async () => {
    setMessages(await fetchNotes());
  }

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    update();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight; // Scroll to the bottom
    }
  }, [messages])

  async function handleAddNote(role: string, content: string) {
    const id = uuid();
    const created_at = new Date().toISOString();
    const embedding = await generateEmbedding(content);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id,
        content,
        created_at,
        embedding,
        role,
      },
    ]);
    await addNote({
      role,
      content,
      embedding
    });
  }

  async function handleUpdateNote(id: string, content: string) {
    const newMessages = messages.map((m) =>
      m.id === id ? { ...m, content: content } : m
    );
    setMessages(newMessages);
    await updateNote(id, {content});
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const input = (e.target as HTMLInputElement).value; // Cast e.target
      if (input) {
        // Search notes if first two characters are spaces
        if (input.startsWith(' ')) {
          await handleAddNote('user', input.trim());
          handleChat(input.trim());
        } else {
          handleAddNote('user', input);
        }
        setEditing(null); // Close note editor
        (e.target as HTMLInputElement).value = ""; // Clear the input field
      }
    }
  };  

  return (
    <div className='flex justify-start items-start w-full bg-blue-500'>
      <div style={sidePanelStyle} className="flex flex-col h-full pb-8">
      <div 
        ref={containerRef}
        className="pt-3 pb-5 flex-grow overflow-auto flex flex-col scrollbar scrollbar-thumb-blue-500 scrollbar-track-gray-300">
        {editing ? 
          <NoteEdit content={editing.content} onChange={(e) => {handleUpdateNote(editing.id, e.target.value)}} close={() => {setEditing(null)}}/> : 
          <NoteChat messages={messages} onNoteClick={(note) => {setEditing(note)}}/>}
      </div>
      <div className="p-3 pt-0">
        <input 
          className="h-12 flex-shrink-0 w-full rounded-lg focus:outline-none p-3"
          style={{backgroundColor: "#2f2f2f"}}
          onKeyDown={handleKeyDown}
          />
      </div>
    </div>
    </div>
  );
}

export default App


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
    <div className="p-4 pt-2 pb-2 w-full user-message cursor-pointer" onClick={onClick}>
      <ReactMarkdown>{content}</ReactMarkdown>
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
          setValue(e.target.value);
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