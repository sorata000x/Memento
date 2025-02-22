import { useEffect, useState } from "react";
import { Message, Note, Response } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";
import {v4 as uuid} from 'uuid';

const NoteChat = ({
  notes, 
  responses, 
  onNoteClick,
  onNoteChange,
  openKnowledgeBase,
}: {
  notes: Note[], 
  responses: Response[],
  onNoteClick: (n: Note | null) => void,
  onNoteChange: (id: string, content: string) => void,
  openKnowledgeBase: (content: string, knowledgeBase: {id: string, similarity: number}[]) => void,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const merged = [
      ...notes.map(n => ({
        id: n.id,
        content: n.content,
        time: n.last_updated,
        role: "note",
        file_paths: n.file_paths
      })),
      ...responses.map(r => ({
        id: r.id,
        content: r.content,
        time: r.created_at,
        role: "response",
      }))
    ];
    const sorted = merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    setMessages([...sorted]);
  }, [notes, responses])

  let last_date: string;
  return <>
    {
      messages.map((m) => {
        if(!m.id || !m.content || !m.time || !m.role) {
          console.debug(`m.id: ${m.id}, m.content: ${m.content}, m.time: ${m.time}, m.role: ${m.role}`);
          return
        }
        const components = [];
        const date = new Date(m.time);
        // Format the date
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);
        if(!last_date || last_date !== formattedDate) {
          last_date = formattedDate;
          components.push(<ChatDateDivider key={uuid()} date={last_date} />)
        }
        if (m.role == 'note') {
          components.push(
            <UserNote 
              key={m.id} 
              content={m.content} 
              filePaths={m.file_paths || []} 
              onClick={() => onNoteClick(notes.find(n => n.id == m.id) || null)}
              onChange={(content: string) => onNoteChange(m.id, content)}/>)
        } 
        if (m.role == 'response') {
          components.push(<AssistantNote key={m.id} content={m.content} onClick={() => openKnowledgeBase(m.content, responses.find(r => r.id == m.id)?.knowledge_base || [])} />)
        }
        return components;
      })
    }
  </>
}

export default NoteChat;