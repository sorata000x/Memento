import { useEffect, useState } from "react";
import { Message, Note, Response } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";

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
          components.push(<UserNote key={m.id} content={m.content} onClick={() => onNoteClick(notes.find(n => n.id == m.id) || null)}/>)
        } 
        if (m.type == 'response') {
          const knowledgeBase = responses.find(r => r.id == m.id)?.knowledge_base || [];
          const knowledgeBaseStr: string[] = []
          for (let i=0; i<knowledgeBase.length; i++) {
            const note = notes.find(n => n.id == knowledgeBase[i].id);
            if (note) {
              knowledgeBaseStr.push(`${note.content}\n\n[S: ${knowledgeBase[i].similarity}]`)
            }
          }
          components.push(<AssistantNote key={m.id} content={m.content} onClick={() => openKnowledgeBase(m.content, knowledgeBaseStr)} />)
        }
        return components;
      })
    }
  </>
}

export default NoteChat;