import { useEffect, useRef } from "react";
import { Note } from "../types";
import { UserNote } from "./NoteChat/components";

const DeleteConfirmationPopup = ({note, onDelete, onCancel}: {note: Note, onDelete: () => void, onCancel: () => void}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          onCancel();
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
  
      // Cleanup the event listener
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [onCancel]);
    
    return <div ref={ref} className='z-20 flex items-center justify-center h-[100vh] w-[100vw] bg-black bg-opacity-50 absolute bg-[#212121]'>
      <div className='flex flex-col w-[16rem] bg-[#212121] p-3 rounded-md'>
        <h1 className='text-base font-semibold'>Delete Note</h1>
        <p className='py-2'>Are you sure you want to delete this note?</p>
        <div className='border border-[#515151] rounded-md my-3 mb-6'>
          <UserNote content={note.content} filePaths={note.file_paths || []}/>
        </div>
        <div className='grow'/>
        <div className='flex justify-end font-semibold'>
          <button onClick={()=>onCancel()} className='px-6 bg-transparent'>
            Cancel
          </button>
          <button onClick={()=>onDelete()} className='px-4 py-1 m-0 bg-red-600 hover:bg-red-900'>
            Delete
          </button>
        </div>
      </div>
    </div>
  }

export default DeleteConfirmationPopup;