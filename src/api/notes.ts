import { supabase } from '../lib/supabase';

export const handleAuth = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error fetching session:', error.message);
        return;
    }

    const session = data.session; // Access the session
    const user = session?.user; // Access the user within the session

    if (user) {
        console.log('User ID:', user.id);
        console.log('User Email:', user.email);

        // Handle user logic (e.g., adding to the database) here
    } else {
        console.log('No user is logged in.');
    }
};

// Fetch notes
export async function fetchNotes() {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user', userId)
        .order('created_at', { ascending: true });

    if (notesError) throw notesError;
    return notes;
}

// Add note
export async function addNote({ role, content, embedding }: {
    role: string,
    content: string,
    embedding: number[],
  }) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    try {
        const { data: note, error: noteError } = await supabase
            .from('notes')
            .insert({ role, content, embedding, user: userId });
        if (noteError || !note) throw noteError;
        return note[0];
    } catch (e) {
        console.log(`Error: ${JSON.stringify(e)}`);
    }
}

// Update note
export async function updateNote(id: string, { content }: { content: string; }) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: updatedNote, error: updateError } = await supabase
        .from('notes')
        .update({ content })
        .eq('id', id)
        .eq('user', userId); // Ensures the note belongs to the user

    if (updateError || !updatedNote) throw updateError;
    return updatedNote[0];
}

// Delete note
export async function deleteNote(id: string) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: deletedNote, error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user', userId);

    if (deleteError) throw deleteError;
    return deletedNote;
}

// Search notes
export async function searchNotes(query: string) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: searchResults, error: searchError } = await supabase.rpc('search_notes', {
        search_text: query,
        user: userId, // Assuming the RPC function is modified to filter by user
    });

    if (searchError) throw searchError;
    return searchResults;
}
