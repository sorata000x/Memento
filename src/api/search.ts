import { supabase } from "../lib/supabase";

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export async function hybridSearch(
  query: string,
  embedding: number[]
): Promise<Note[]> {
  const { data, error } = await supabase.rpc('search_notes', {
      search_text: query,
      query_embedding: embedding,
  });
  if (error) throw error;
  return data;
}
