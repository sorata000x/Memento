import icon from "../../assets/memento-icon.png";
import { MdOutlineStickyNote2 } from "react-icons/md";
import Markdown from 'react-markdown';
import { CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileObject } from "@supabase/storage-js";
import remarkGfm from "remark-gfm";
import { IoIosMore } from "react-icons/io";

export const Suggestion = ({text, onClick}: {text: string, onClick: () => void}) => {
    return (
      <div 
        className='p-2 pl-3 pr-3 suggestion cursor-pointer' 
        onClick={onClick}>
        {text}
      </div>
    )
}

/*
const URLCard = (preview) => {
  return (
    <div>
      {preview.images?.[0] && (
        <img src={preview.images[0]} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
      )}
      <h2 className="text-xl font-semibold mt-2">{preview.title}</h2>
      <p className="text-sm text-gray-600">{preview.description}</p>
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline mt-2 inline-block"
      >
        Visit Site
      </a>
    </div>
  )
}
*/

const CheckboxMarkdown = ({ content, onContentChange }: { content: string, onContentChange?: (content: string) => void }) => {
  const getCheckboxes = (content: string) => {
    return content.split("\n").map((line, index) => ({
      index,
      isChecked: line.includes("- [x]"),
      isCheckbox: /^(\s*)- \[(x| )\] /.test(line),
    }));
  };

  const [checkboxes, setCheckboxes] = useState(getCheckboxes(content));

  useEffect(() => {
    setCheckboxes(getCheckboxes(content));
  }, [content]);

  const handleCheckboxToggle = (lineIndex: number) => {
    const updatedCheckboxes = checkboxes.map((cb) =>
      cb.index === lineIndex ? { ...cb, isChecked: !cb.isChecked } : cb
    );

    setCheckboxes(updatedCheckboxes);

    const updatedContent = content
      .split("\n")
      .map((line, i) => {
        const checkbox = updatedCheckboxes.find((cb) => cb.index === i);
        if (checkbox && checkbox.isCheckbox) {
          return checkbox.isChecked ? line.replace("- [ ]", "- [x]") : line.replace("- [x]", "- [ ]");
        }
        return line;
      })
      .join("\n");

    if(onContentChange) onContentChange(updatedContent);
  };

  const renderContent = content.split("\n").map((line, index) => {
    const match = line.match(/^(\s*)- \[(x| )\] (.*)/);
    if (match) {
      const indent = match[1] || "";
      const checkbox = checkboxes.find((cb) => cb.index === index);
      const isChecked = checkbox?.isChecked || false;
      const markdownText = match[3]; // The actual text after "- [ ]"

      return (
        <div key={index} className="p-1 flex items-center gap-2" style={{ paddingLeft: indent.length * 8 + 2 }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleCheckboxToggle(index)}
            className="cursor-pointer"
          />
          {/* ✅ FIX: Render markdown inside a <Markdown> component so links work */}
          <Markdown className="markdown" remarkPlugins={[remarkGfm]}>{markdownText}</Markdown>
        </div>
      );
    }
    return <Markdown key={index} className="markdown" remarkPlugins={[remarkGfm]}>{line}</Markdown>;
  });

  return <div className="w-full">{renderContent}</div>;
};

export const UserNote = ({content, filePaths, onClick, onChange}: {content: string, filePaths: string[], onClick?: () => void, onChange?: (content: string) => void}) => {
  const [fileData, setFileData] = useState<{path: string, metadata: FileObject | undefined, url: string | undefined}[]>([]);

  const fetchFileData = async () => {
    const promise = filePaths.map(async (p) => ({
      path: p,
      metadata: await fetchMetadata(p), 
      url: await fetchSignedUrl(p), 
    }));
  
    const resolvedData = await Promise.all(promise);
    setFileData(resolvedData);
  }

  const fetchMetadata = async (filePath: string) => {
    const folderPath = filePath.substring(0, filePath.lastIndexOf("/")); // Extract folder path
    const fileName = filePath.split("/").pop();
    const { data, error } = await supabase.storage.from("files").list(folderPath);
    
    if (error) {
      console.error("Error fetching metadata:", error);
      return;
    }

    const fileData = data.find((item) => item.name === fileName);
    
    if (fileData) {
      return fileData;
    } else {
      console.log("File not found.");
    }
  };

  const fetchSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("files")
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (!error) return data.signedUrl;
  };

  useEffect(() => {
    fetchFileData();

    const interval = setInterval(fetchFileData, 55 * 60 * 1000);

    return () => clearInterval(interval);
  }, [])

  const processedContent = content
    .replace(/\n/g, "  \n")

  const [isHovering, setHovering] = useState(false);
  const [isHoveringMore, setHoveringMore] = useState(false);

  return (
      <div 
        className="p-4 pt-2 pb-2 w-full user-Note hover:bg-[#202020] relative" 
        onMouseOver={()=>setHovering(true)}
        onMouseOut={()=>setHovering(false)}>
        <CheckboxMarkdown content={processedContent} onContentChange={(content: string) => {
          if(onChange) {
            onChange(content);
          }
        }}/>
        { 
          isHoveringMore ?
          <div className="absolute right-2 top-[-1.5rem] bg-[#181818] p-1 px-3 rounded-md">Edit</div>
          : null
        }
        { 
          isHovering ?
          <div className="absolute right-4 top-1 hover:bg-[#303030] p-1 rounded-md cursor-pointer"
            onClick={onClick}
            onMouseOver={()=>setHoveringMore(true)}
            onMouseOut={()=>setHoveringMore(false)}
          >
            <IoIosMore 
              size={20}
              />
          </div>
          : null
        }
        { fileData.length > 0 ? 
          <div className='flex rounded-lg overflow-scroll gap-3 p-3'>
            {fileData.map((d, index) => (
              <div key={index} className="p-2 rounded-md bg-[#212121] max-w-[10rem] max-h-[10rem] relative">
                {d.path.endsWith(".jpg") || d.path.endsWith(".png") || d.path.endsWith(".jpeg") ? (
                  <div className='flex justify-center'>
                    <img src={d.url} alt={d.metadata?.name} className="max-w-[10rem] max-h-[7rem] rounded-md"/>
                  </div>
                ) : d.metadata?.name.endsWith(".mp4") ? (
                  <video src={d.url} controls className="max-w-xs" />
                ) : d.metadata?.name.endsWith(".pdf") ? (
                  <embed src={d.url} type="application/pdf" className="max-w-xs" />
                ) : (
                  <a href={d.url} target="_blank" rel="noopener noreferrer">
                    Open File
                  </a>
                )}
              </div>
            ))}
          </div> : null
        }
        {/*<p className='text-end pt-1 text-[#565656]' style={{fontSize: "10pt"}}>{formattedDate}</p> */}
      </div>
    )
}

export const LoadingNote = () => {

  return (
      <div 
        className="p-4 pt-2 pb-2 w-full">
        <div className="bg-[#313131] rounded-lg w-full h-5"></div>
      </div>
    )
}

export const AssistantNote = ({content, onClick}: {content: string, onClick?: () => void}) => {
  const processedContent = content
    .replace(/\n/g, "  \n")

  return (
    <div className="flex py-2 px-4 w-ful" style={{backgroundColor: "#191919"}}>
      <img height={14} width={14} className='mr-2 mt-[0.2rem] flex-shrink-0' style={{ width: '14px', height: '14px' }} src={icon} alt="icon"/>
      {
        content.length == 0 ? 
        <CircularProgress size={18} style={{ color: "white" }}/>
        :
        <div className="flex flex-col">
          <CheckboxMarkdown content={processedContent}/>
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
      }
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