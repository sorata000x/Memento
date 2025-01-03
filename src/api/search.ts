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
    .eq('user_id', userId)
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
  const { data, error } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (error || !userId) throw new Error('User not authenticated');
  const { data: searchData, error: searchError } = await supabase.rpc('hybrid_search', {
      search_text: query,
      query_embedding: embedding,
      t_user_id: userId
  });
  if (searchError) throw searchError;
  return searchData;
}

//Supabase Function Definiton
/* 
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.content,
        -- Combined score: weighted average of text match and semantic similarity
        (0.7 * (1 - (n.embedding <=> query_embedding))) +  -- Semantic similarity weight
        (0.3 * CASE WHEN n.content ILIKE '%' || search_text || '%' THEN 1 ELSE 0 END) AS similarity,
        n.created_at
    FROM notes n
    WHERE
        n.user_id = user_id -- Ensure only notes of the specified user are searched
        AND (
            n.content ILIKE '%' || search_text || '%' -- Text match condition
            OR (1 - (n.embedding <=> query_embedding)) > 0 -- Semantic similarity condition
        )
    ORDER BY similarity DESC; -- Order results by similarity
END;
*/