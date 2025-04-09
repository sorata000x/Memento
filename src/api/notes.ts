import { createClient, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Note } from '../types';
import { getEmbedding } from './openai';

const SUPABASE_URL = "https://vmosommpjhpawkanucoo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb3NvbW1wamhwYXdrYW51Y29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMTg4NTcsImV4cCI6MjA1MDU5NDg1N30.XtL4l5rEajnnOslELP9iITQynlXTOjaV_3p-c_vSKFc";

export const addUserToDatabase = async (user: User) => {
    if (!user) return;
  
    try {
    console.log(`user.id: ${user.id}`)
      const { data, error } = await supabase.from('users').upsert([{
        id: user.id, // Use the user's unique ID
        created_at: new Date().toISOString(),
        email: user.email, // User's email
        name: user.user_metadata?.full_name || null, // Optional: Use the user's name from metadata
      }],
      { onConflict: 'id' }); // Prevent duplicates by ensuring the same `id` doesn't insert twice
  
      if (error) {
        console.error('Error adding user to the database:', error);
      } else {
        console.log('User added to the database:', data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
};

export const handleAuth = async () => {

    // Fetch the session and user details
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error fetching session:', error.message);
        return;
    }

    const session = data.session;

    if (!session) {
        console.error('No active session. User is not logged in.');
        return;
    }

    const user = session.user;

    if (user) {
        // Re-initialize Supabase client with user access token
        const supabaseWithAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${session.access_token}`, // Use access token from session
                },
            },
        });

        // Example: Insert a record into the "users" table
        const { data: insertData, error: insertError } = await supabaseWithAuth
            .from('users')
            .upsert(
                [
                    {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    },
                ],
                { onConflict: 'id' }
            );

        if (insertError) {
            console.error('Error inserting/upserting user:', insertError.message);
        } else {
            console.log('User successfully inserted/upserted:', insertData);
        }
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
        .select('id, content, user_id, created_at, role, knowledge_base, hide, is_deleted, last_updated')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (notesError) throw notesError;
    return notes;
}

// Add note
export async function addNote({ role, content, embedding, filePaths }: {
    role: string,
    content: string,
    embedding: number[],
    filePaths: string[],
  }) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    try {
        const { data: note, error: noteError } = await supabase
            .from('notes')
            .insert({ role, content, embedding, user_id: userId, file_paths: filePaths });
        if (noteError || !note) throw noteError;
        return note[0];
    } catch (e) {
        console.log(`Error: ${JSON.stringify(e)}`);
    }
}

// Update note
export async function updateNote(id: string, content: string, embedding: number[], knowledge_base?: {id: string, similarity: number}[], hide?: boolean) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: updatedNote, error: updateError } = await supabase
        .from('notes')
        .update({ content, embedding, knowledge_base, hide })
        .eq('id', id); // Ensures the note belongs to the user

    if (updateError || !updatedNote) throw updateError;
    return updatedNote[0];
}

export async function upsertNote(newNote: Note) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;
  
    if (error || !userId) throw new Error('User not authenticated');

    const embedding = await getEmbedding(newNote.content);
  
    try {
      if (newNote.id) {
        // Try updating the note
        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({ content: newNote.content, role: newNote.role, embedding })
          .eq('id', newNote.id)
          .eq('user_id', userId)
          .select(); // Ensures the data returned is queryable
  
        if (updateError) throw updateError;
  
        // Check if the update succeeded (updatedNote has items)
        if (updatedNote && updatedNote.length > 0) {
          return updatedNote[0];
        }
      }
  
      // If no id is provided or the update didn't find a matching note, insert a new note
      const { data: newNotes, error: insertError } = await supabase
        .from('notes')
        .insert({ ...newNote, user_id: userId, embedding })
        .select('*');
  
      if (insertError) throw insertError;
  
      return newNotes[0];
    } catch (e) {
      console.log(`Error: ${JSON.stringify(e)}`);
      throw e;
    }
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
        .eq('user_id', userId);

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
        user_id: userId, // Assuming the RPC function is modified to filter by user
    });

    if (searchError) throw searchError;
    return searchResults;
}
