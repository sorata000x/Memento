import ReactMarkdown from "react-markdown";
import { AssistantNote } from "../NoteChat/components";
import { IoIosArrowBack } from "react-icons/io";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { Note } from "../../types";

const KnowledgeBase = ({
    note,
    knowledgeBase,
    close,
}: {
    note: Note,
    knowledgeBase: string[],
    close: () => void
}) => {
    const KBNote = ({content}: {content: string}) => {
        return (
          <div className="p-4 pt-0 pb-2 w-full user-Note">
            <ReactMarkdown className="markdown">{content}</ReactMarkdown>
            {/*<p className='text-end pt-1 text-[#565656]' style={{fontSize: "10pt"}}>{formattedDate}</p> */}
          </div>
        )
    }

    return <div className='z-30 absolute flex flex-col h-full w-full bg-[#212121]'>
        <div className='flex item-start justify-between p-3'>
            <IoIosArrowBack className='m-1 cursor-pointer' onClick={() => close()} size={22}/>
        </div>
        <div className='overflow-y-auto h-[100vh]'>
            <AssistantNote note={note} />
            <div 
                className="flex items-center gap-1 text-xm p-3 text-[#919191]">
                <MdOutlineStickyNote2 />
                Knowledge Base
            </div>
            {knowledgeBase.map(k => <KBNote content={k} />)}
        </div>
    </div>
}

export default KnowledgeBase;