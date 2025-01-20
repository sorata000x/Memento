import { useEffect, useState } from "react";
import { Message, Note, Response } from "../../types";
import { AssistantNote, ChatDateDivider, SystemNote, UserNote } from "./components";
import {v4 as uuid} from "uuid";

const NoteChat = ({
  notes, 
  responses, 
  onNoteClick,
  openKnowledgeBase,
}: {
  notes: Note[], 
  responses: Response[],
  onNoteClick: (n: Note | null) => void,
  openKnowledgeBase: (content: string, knowledgeBase: string[]) => void,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const merged = [
      ...notes.map(n => ({
        id: n.id,
        content: n.content,
        time: n.last_updated,
        type: "note",
      })),
      ...responses.map(r => ({
        id: r.id,
        content: r.content,
        time: r.created_at,
        type: "response",
      }))
    ];
    const sorted = merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    setMessages([...sorted]);
  }, [notes, responses])

  let last_date: string;
  return <>
    <SystemNote content={`- Type anything and press enter in the input below to add a note.\n- Add space key in front of your input (e.g. " What is my todos for today") to chat with AI assistance based on your notes.`}/>
    {
      messages.map((m) => {
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
          components.push(<ChatDateDivider date={last_date} />)
        }
        if (m.type == 'note') {
          components.push(<UserNote key={uuid()} content={m.content} onClick={() => onNoteClick(notes.find(n => n.id == m.id) || null)}/>)
        } 
        if (m.type == 'response') {
          const ids = responses.find(r => r.id == m.id)?.knowledge_base_ids || [];
          const knowledgeBase = notes.filter(n => ids.includes(n.id)).map(n => `${n.content}\n\n(at ${n.last_updated})`);
          components.push(<AssistantNote key={uuid()} content={m.content} onClick={() => openKnowledgeBase(m.content, knowledgeBase)} />)
        }
        return components;
      })
    }
  </>
}

export default NoteChat;