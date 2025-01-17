import { supabase } from '../lib/supabase';

// Fetch responses
export async function fetchResponses() {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (responsesError) throw responsesError;
    return responses;
}

// Add responses
export async function addResponses({ content, embedding, knowledge_base_ids }: {
    content: string,
    embedding: number[],
    knowledge_base_ids: string[]
  }) {
    const { data, error } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (error || !userId) throw new Error('User not authenticated');

    try {
        const { data: responses, error: responsesError } = await supabase
            .from('responses')
            .insert({ content, embedding, user_id: userId, knowledge_base_ids });
        if (responsesError || !responses) throw responsesError;
        return responses[0];
    } catch (e) {
        console.log(`Error: ${JSON.stringify(e)}`);
    }
}
