import { Note } from "../../types";
import { AssistantNote, ChatDateDivider, UserNote } from "./components";
import { List, AutoSizer, InfiniteLoader, CellMeasurerCache, CellMeasurer } from "react-virtualized";
import { fetchNotesBatch, fetchNotesCount } from "../../api/notes";
import { useProvider } from "../../StateProvider";
import { useEffect, useRef, useState } from "react";

const NoteChat = ({
  notes,
  onNoteClick,
  onNoteChange,
  openKnowledgeBase,
}: {
  notes: Note[];
  onNoteClick: (n: Note | null) => void;
  onNoteChange: (id: string, content: string) => void;
  openKnowledgeBase: (content: string, knowledgeBase: { id: string; similarity: number }[]) => void;
}) => {
  const [, dispatch] = useProvider();
  const [notesCount, setNotesCount] = useState(0);
  const [prevNotesLength, setPrevNotesLength] = useState(0); // Track previous notes length
  const [scrollTop, setScrollTop] = useState(0); // Track scroll position via state
  const listRef = useRef<any>(null);
  const isInitialMount = useRef(true);

  const isRowLoaded = ({ index }: { index: number }) => {
    return notes.length - index < notes.length;
  };

  const loadMoreRows = async ({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
    console.log("loadMoreRows called with startIndex:", startIndex, "stopIndex:", stopIndex);
    if (startIndex >= 5) {
      console.log("Skipping loadMoreRows - not near top");
      return;
    }
    const oldestNote = notes[0];
    if (!oldestNote) return;

    console.log(`old notes: ${notes.length}`);
    const olderNotes = await fetchNotesBatch(oldestNote.id);
    console.log("olderNotes fetched:", olderNotes);
    if (olderNotes && olderNotes.length > 0) {
      dispatch({
        type: "ADD_NOTES",
        newNotes: olderNotes,
        prepend: true,
      });
      console.log(`new notes: ${notes.length}`);
    }
  };

  useEffect(() => {
    const updateNotesCount = async () => {
      const count = await fetchNotesCount();
      console.log("notesCount set to:", count, "notes.length:", notes.length);
      if (count) setNotesCount(count);
    };
    updateNotesCount();
  }, []);

  // Recalculate heights and adjust scroll position when notes change
  useEffect(() => {
    if (listRef.current) {
      cache.clearAll();
      listRef.current.recomputeRowHeights();

      if (!isInitialMount.current && notes.length > prevNotesLength) {
        const newNotesHeight = olderNotesHeight(notes, prevNotesLength);
        const newScrollTop = scrollTop + newNotesHeight; // Use state value
        listRef.current.scrollToPosition(newScrollTop);
      }
      setPrevNotesLength(notes.length); // Update previous length after rendering
    }
  }, [notes]);

  // Helper function to calculate the height of prepended notes
  const olderNotesHeight = (currentNotes: Note[], prevLength: number) => {
    const newNotesCount = currentNotes.length - prevLength;
    let totalHeight = 0;
    for (let i = 0; i < newNotesCount; i++) {
      totalHeight += cache.getHeight(i, 0) || cache.defaultHeight;
    }
    return totalHeight;
  };

  useEffect(() => {
    if (isInitialMount.current && listRef.current && notes.length > 0) {
      listRef.current.scrollToRow(notes.length - 1);
      isInitialMount.current = false;
    }
  }, [notes]);

  const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 50,
  });

  const rowRenderer = ({ index, key, parent, style }: any) => {
    const note = notes[index];
    const date = new Date(note.created_at);
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);

    const showDateDivider =
      index === 0 ||
      formattedDate !==
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(notes[index - 1].created_at));

    return (
      <CellMeasurer
        key={key}
        cache={cache}
        columnIndex={0}
        parent={parent}
        rowIndex={index}
      >
        {({ measure, registerChild }) => (
          <div ref={registerChild} style={{ ...style }} onLoad={measure}>
            {showDateDivider && <ChatDateDivider date={formattedDate} />}
            {note.role === "assistant" ? (
              <AssistantNote
                content={note.content}
                onClick={() => openKnowledgeBase(note.content, note.knowledge_base || [])}
              />
            ) : (
              <UserNote
                content={note.content}
                filePaths={note.file_paths || []}
                onClick={() => onNoteClick(note)}
                onChange={(content) => onNoteChange(note.id, content)}
              />
            )}
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={notesCount}
          minimumBatchSize={10}
          threshold={5}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              ref={(ref) => {
                listRef.current = ref;
                registerChild(ref);
              }}
              width={width}
              height={height}
              rowCount={notes.length}
              deferredMeasurementCache={cache}
              rowHeight={cache.rowHeight}
              rowRenderer={rowRenderer}
              onRowsRendered={(info) => {
                console.log("onRowsRendered:", info);
                onRowsRendered(info);
              }}
              onScroll={({ scrollTop }) => setScrollTop(scrollTop)} // Update scroll position state
              overscanRowCount={0}
            />
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

export default NoteChat;