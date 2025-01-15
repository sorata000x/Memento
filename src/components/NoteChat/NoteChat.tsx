import { Note } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";
import {v4 as uuid} from "uuid";

const NoteChat = ({notes, onNoteClick}: {notes: Note[], onNoteClick: (n: Note) => void}) => {
  let last_date: string;
  return <>
    {
      notes.map((n) => {
        const components = [];
        const date = new Date(n.last_updated);
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
        if (n.role == 'user') {
          components.push(<UserNote key={uuid()} note={n} onClick={() => onNoteClick(n)}/>)
        } 
        if (n.role == 'assistant') {
          components.push(<AssistantNote key={uuid()} content={n.content} />)
        }
        return components;
      })
    }
  </>
}

export default NoteChat;