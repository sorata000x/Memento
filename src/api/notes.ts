import { supabase } from '../lib/supabase';

// Fetch notes
export async function fetchNotes() {
    const { data, error } = await supabase.from('notes').select('*');
    if (error) throw error;
    return data;
}

// Add note
export async function addNote({ role, content, embedding }: {
    role: string,
    content: string,
    embedding: number[],
  }) {
    try {
        const { data, error } = await supabase.from('notes').insert({ role, content, embedding });
        if (error || !data) throw error;
        return data[0];
    } catch (e) {
        console.log(`Error: ${e}`);
    }
}

// Update note
export async function updateNote(id: string, { content }: 
    {
    content: string;
  }) {
    const { data, error } = await supabase.from('notes').update({ content }).eq('id', id);
    if (error || !data) throw error;
    return data[0];
}

// Delete note
export async function deleteNote(id: string) {
    const { data, error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
    return data;
}

// Search notes
export async function searchNotes(query: string) {
    const { data, error } = await supabase.rpc('search_notes', { search_text: query });
    if (error) throw error;
    return data;
}
