import { Note } from "../../types"
import ReactMarkdown from 'react-markdown';
import icon from "../../assets/memento-icon.png";

export const Suggestion = ({text, onClick}: {text: string, onClick: () => void}) => {
    return (
      <div 
        className='p-2 pl-3 pr-3 suggestion cursor-pointer' 
        onClick={onClick}>
        {text}
      </div>
    )
}

export const UserNote = ({note, onClick}: {note: Note, onClick: () => void}) => {
    return (
      <div className="p-4 pt-2 pb-2 w-full user-Note cursor-pointer flex" onClick={onClick}>
        <ReactMarkdown className="markdown">{note.content}</ReactMarkdown>
        {/*<p className='text-end pt-1 text-[#565656]' style={{fontSize: "10pt"}}>{formattedDate}</p> */}
      </div>
    )
}

export const AssistantNote = ({content}: {content: string}) => {
  return (
    <div className="flex py-2 px-4 w-ful" style={{backgroundColor: "#191919"}}>
      <img height={14} width={14} className='mr-2 mt-[0.2rem] flex-shrink-0' style={{ width: '14px', height: '14px' }} src={icon} alt="icon"/>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

export const ChatDateDivider = ({ date }: { date: string}) => {
  return (
    <div className="flex items-center w-full my-1 px-2">
      {/* Horizontal line on the left */}
      <div className="flex-grow border-t border-[#414141]"></div>
      
      {/* Date in the middle */}
      <span className="px-3 text-[#818181] font-medium" style={{fontSize: "9pt"}}>{date}</span>
      
      {/* Horizontal line on the right */}
      <div className="flex-grow border-t border-[#414141]"></div>
    </div>
  );
};