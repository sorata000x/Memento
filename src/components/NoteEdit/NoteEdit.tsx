//@ts-nocheck
import { useEffect, useRef, useState } from "react";
import { MorePopUp } from "./components";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosMore } from "react-icons/io";

const NoteEdit = ({content, confirmDelete, onChange, close}: {content: string, confirmDelete: () => void, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, close: () => void}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState<string>(content);
    const [showMorePopUp, setShowMorePopUp] = useState<boolean>(false);
  
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus(); // Autofocus
        textareaRef.current.selectionStart = textareaRef.current.value.length; // Set cursor position to the end
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, []);
    
    return (
      <div className='absolute z-10 flex flex-col h-[calc(100%-5.97rem)] w-full bg-[#212121] p-3'>
        {showMorePopUp ? 
          <MorePopUp 
            confirmDelete={confirmDelete} 
            closePopUp={()=>setShowMorePopUp(false)}
            /> : null}
        <div className='flex item-center justify-between'>
          <IoIosArrowBack className='m-1 mb-0 cursor-pointer' onClick={() => close()} size={22}/>
          <IoIosMore 
            onClick={() => setShowMorePopUp(true)}
            className='cursor-pointer px-1 hover:bg-[#313131] rounded-md' size={33}/>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const updatedValue = e.target.value;
            setValue(updatedValue);
            onChange(e);
          }}
          placeholder='tesrt'
          className='h-full bg-transparent focus:outline-none p-2'
          style={{
            boxSizing: 'border-box',
            resize: 'none',
          }}
        />
      </div>
    )
}

export default NoteEdit;