import { useState } from "react";
import { Note } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";
import { v4 as uuid } from "uuid";
import { FiPlusCircle, FiMinusCircle } from "react-icons/fi";

const NoteChat = ({
  notes,
  onNoteChange,
  openKnowledgeBase,
}: {
  notes: Note[];
  onNoteChange: (id: string, content: string) => void;
  openKnowledgeBase: (note: Note, knowledgeBase: { id: string; similarity: number }[]) => void;
}) => {
  let last_date: string;
  const [visibleHiddenGroups, setVisibleHiddenGroups] = useState<Record<number, boolean>>({});

  const toggleHiddenNotes = (groupKey: number) => {
    setVisibleHiddenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <>
      {notes
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((n, i, arr) => {
          const components = [];
          const date = new Date(n.created_at);

          // Format the date
          const formattedDate = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(date);

          // Date Divider
          if (!last_date || last_date !== formattedDate) {
            last_date = formattedDate;
            components.push(<ChatDateDivider key={uuid()} date={last_date} />);
          }

          // Find the group start for consecutive hidden notes
          let groupKey = null;
          let hiddenCount = 0;

          if (n.hide) {
            let j = i;
            while (j > 0 && arr[j - 1].hide) j--; // Find the first hidden note in this sequence
            groupKey = j; // The first hidden note acts as the group key

            // Count how many hidden notes belong to this group
            while (i + hiddenCount < arr.length && arr[i + hiddenCount].hide) {
              hiddenCount++;
            }
          }

          // Insert toggle button at the start of the hidden group
          if (groupKey === i) {
            components.push(
              <button
                key={`toggle-${groupKey}`}
                onClick={() => toggleHiddenNotes(groupKey!)}
                className="toggle-button m-0 p-1 px-3 bg-[#292929] rounded-none flex items-center text-[#929292] justify-end"
              >
                <span className="mr-2 text-[9pt]">
                  {visibleHiddenGroups[groupKey!] ? "hide" : `${hiddenCount} hidden note${hiddenCount > 1 ? "s" : ""}`}
                </span>
                {visibleHiddenGroups[groupKey!] ? <FiMinusCircle /> : <FiPlusCircle />}
              </button>
            );
          }

          // Show hidden notes only if toggled open
          if (!n.hide || visibleHiddenGroups[groupKey!]) {
            if (n.role === "assistant") {
              components.push(
                <AssistantNote
                  key={n.id}
                  note={n}
                  onClick={() => openKnowledgeBase(n, n.knowledge_base || [])}
                />
              );
            } else {
              components.push(
                <UserNote
                  key={n.id}
                  note={n}
                  onChange={(content: string) => onNoteChange(n.id, content)}
                />
              );
            }
          }

          return components;
        })}
    </>
  );
};

export default NoteChat;

