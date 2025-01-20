import ReactMarkdown from 'react-markdown';
import icon from "../../assets/memento-icon.png";
import { MdOutlineStickyNote2 } from "react-icons/md";
import "../../App.css";
import { HiOutlineLightBulb } from "react-icons/hi";

export const Suggestion = ({text, onClick}: {text: string, onClick: () => void}) => {
    return (
      <div 
        className='p-2 pl-3 pr-3 suggestion cursor-pointer' 
        onClick={onClick}>
        {text}
      </div>
    )
}

export const UserNote = ({content, onClick}: {content: string, onClick?: () => void}) => {
    return (
      <div className="p-4 pt-2 pb-2 w-full user-Note cursor-pointer" onClick={onClick}>
        <ReactMarkdown className="markdown">{content.replace(/\n\n/g, "  \n &nbsp;  \n").replace(/\n/g, "  \n")}</ReactMarkdown>
        {/*<p className='text-end pt-1 text-[#565656]' style={{fontSize: "10pt"}}>{formattedDate}</p> */}
      </div>
    )
}

export const AssistantNote = ({content, onClick}: {content: string, onClick?: () => void}) => {
  return (
    <div className="flex py-2 px-4 w-ful" style={{backgroundColor: "#191919"}}>
      <img height={14} width={14} className='mr-2 mt-[0.3rem] flex-shrink-0' style={{ width: '18px', height: '18px' }} src={icon} alt="icon"/>
      <div className="flex flex-col">
        <ReactMarkdown className="markdown">{content.replace(/\n/g, "  \n")}</ReactMarkdown>
        {
          onClick ? 
          <div 
            onClick={onClick}
            className="flex items-center gap-1 text-xm text-[#919191] cursor-pointer">
            <MdOutlineStickyNote2 />
            Knowledge Base
          </div> : null
        }
      </div>
    </div>
  )
}

export const SystemNote = ({content}: {content: string}) => {
  return (
    <div className="flex py-2 px-4 w-ful" style={{backgroundColor: "#191919"}}>
     <HiOutlineLightBulb className='mr-0 mt-[0rem] flex-shrink-0 text-[#A1A1A1]' size={22}/>
      <div className="flex flex-col">
        <ReactMarkdown className="markdown text-[#A1A1A1] font-medium text-sm">{content.replace(/\n/g, "  \n")}</ReactMarkdown>
      </div>
    </div>
  )
}

export const ChatDateDivider = ({ date }: { date: string}) => {
  return (
    <div className="flex items-center w-full my-1 px-2">
      {/* Horizontal line on the left */}
      <div className="flex-grow border-t border-[#414141]"></div>
      
      {/* Date in the middle */}
      <span className="px-3 text-[#818181] font-medium" style={{fontSize: "10pt"}}>{date}</span>
      
      {/* Horizontal line on the right */}
      <div className="flex-grow border-t border-[#414141]"></div>
    </div>
  );
};