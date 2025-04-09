import { useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { IoIosMore } from "react-icons/io";
import { useProvider } from "../StateProvider";
import { Note } from "../types";

function ActionMenu({ note }: { note: Note }) {
  const [, dispatch] = useProvider();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onEdit = () => {
    dispatch({ type: "SET_EDITING", note });
    handleClose();
  };

  const onHide = () => {
    dispatch({ type: "UPDATE_NOTE", id: note.id, content: note.content, hide: !note.hide });
    handleClose();
  };

  const onDelete = () => {
    dispatch({ type: "SET_DELETING", note });
    handleClose();
  };

  const itemSx = {
    transition: "background-color 0.2s ease-in-out",
    color: "white",
    "&:hover": { backgroundColor: "#303030" },
    borderRadius: "4px",
    fontSize: "11pt",
    minHeight: "10px",
    padding: "0.25rem",
    paddingX: "0.5rem",
    minWidth: "100px"
  };

  return (
    <div className="absolute right-4 top-1">
      <button className="hover:bg-[#242424] bg-[#303030] text-white rounded cursor-pointer p-1" onClick={handleClick}>
        <IoIosMore className="text-white" size={20} />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "center", horizontal: "left" }} // Anchor at left
        transformOrigin={{ vertical: "center", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#000 !important",
              paddingX: "0.25rem !important",
              borderRadius: "8px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              marginLeft: "-10px", // Space between button & menu
              color: "white",
            },
          },
        }}
      >
        {note.role === "user" && <MenuItem sx={itemSx} onClick={onEdit}>Edit</MenuItem>}
        <MenuItem sx={itemSx} onClick={onHide}>Hide</MenuItem>
        <MenuItem sx={itemSx} onClick={onDelete}>Delete</MenuItem>
      </Menu>
    </div>
  );
}

export default ActionMenu;