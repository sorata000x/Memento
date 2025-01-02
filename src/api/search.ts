import { supabase } from "../lib/supabase";
import { Message } from "../pages/MainPage";

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

/**
 * Function to search for notes that start with a specific substring.
 * @param {string} prefix - The substring to match at the start of note content.
 * @returns {Promise<Message[]>} - A promise that resolves to an array of matching notes.
 */
export async function searchNotesByPrefix(prefix: string): Promise<Message[]> {
  const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("id, content, created_at, role")
    .eq('user', userId)
    .eq('role', 'user')
    .ilike("content", `${prefix}%`) // Case-insensitive matching for prefix
    .order('created_at', { ascending: true });

  if (notesError) throw notesError;
  return notes || [];
}

export async function hybridSearch(
  query: string,
  embedding: number[]
): Promise<Note[]> {
  const { data, error } = await supabase.rpc('hybrid_search', {
      search_text: query,
      query_embedding: embedding,
  });
  if (error) throw error;
  return data;
}
