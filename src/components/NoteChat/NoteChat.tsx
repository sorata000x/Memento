import { Note } from "../../types";
import { AssistantNote, ChatDateDivider, LoadingNote, UserNote } from "./components";
import {v4 as uuid} from 'uuid';

const NoteChat = ({
  loading,
  notes, 
  onNoteClick,
  onNoteChange,
  openKnowledgeBase,
}: {
  loading: boolean,
  notes: Note[], 
  onNoteClick: (n: Note | null) => void,
  onNoteChange: (id: string, content: string) => void,
  openKnowledgeBase: (content: string, knowledgeBase: {id: string, similarity: number}[]) => void,
}) => {

  let last_date: string;
  return <>
    {
      loading ? 
      [1, 2, 3, 4, 5].map(_ => <LoadingNote
      />) : null
    }
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
        if (n.role == 'assistant') {
          components.push(<AssistantNote key={n.id} content={n.content} onClick={() => openKnowledgeBase(n.content, n.knowledge_base || [])} />)
        } else {
          components.push(
            <UserNote 
              key={n.id} 
              content={n.content} 
              filePaths={n.file_paths || []} 
              onClick={() => onNoteClick(n)}
              onChange={(content: string) => onNoteChange(n.id, content)}
              />)
        } 
        return components;
      })
    }
  </>
}

export default NoteChat;