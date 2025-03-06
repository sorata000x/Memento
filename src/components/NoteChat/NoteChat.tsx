import { Note } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";
import {v4 as uuid} from 'uuid';

const NoteChat = ({
  notes, 
  onNoteClick,
  onNoteChange,
  openKnowledgeBase,
}: {
  notes: Note[], 
  onNoteClick: (n: Note | null) => void,
  onNoteChange: (id: string, content: string) => void,
  openKnowledgeBase: (content: string, knowledgeBase: {id: string, similarity: number}[]) => void,
}) => {

  let last_date: string;
  return <>
    {
      notes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((n) => {
        const components = [];
        const date = new Date(n.created_at);
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
        console.log(`n.role: ${n.role}`)
        if (n.role == 'assistant') {
          components.push(<AssistantNote key={n.id} content={n.content} onClick={() => openKnowledgeBase(n.content, n.knowledge_base || [])} />)
        } else {
          components.push(
            <UserNote 
              key={n.id} 
              content={n.content} 
              filePaths={n.file_paths || []} 
              onClick={() => onNoteClick(notes.find(n => n.id == n.id) || null)}
              onChange={(content: string) => onNoteChange(n.id, content)}
              />)
        } 
        return components;
      })
    }
  </>
}

export default NoteChat;