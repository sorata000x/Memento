import { useEffect, useRef } from "react";
import { MdDeleteForever } from "react-icons/md";

export const MorePopUp = ({
  confirmDelete, 
    closePopUp}: 
    {
      confirmDelete: () => void, 
      closePopUp: () => void
      closeEdit: () => void}) => {
    const ref = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          closePopUp();
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
  
      // Cleanup the event listener
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [closePopUp]);
  
    return <div ref={ref} className='flex flex-col absolute right-12 w-[10rem] bg-black p-1 rounded-md'>
      <div
        onClick={
          () => {
            confirmDelete();
          }
        } 
        className='flex items-center justify-between hover:bg-[#212121] cursor-pointer rounded-sm py-1 px-2 text-red-500'>
        <p>Delete Note</p>
        <MdDeleteForever size={24}/>
      </div>
    </div>
}