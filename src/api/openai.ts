import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

const openai = new OpenAI({
  apiKey: "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", // This is the default and can be omitted
  dangerouslyAllowBrowser: true
});

async function generateEmbedding(content: string) {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
    });
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

type Note = {
  id: string,
  content: string,
  last_updated: string;
}

export async function chatWithNotes(input: string, notes: Note[]) {
  try {
    // Combine notes into a contextual string
    const context = notes.map(note => `${note.content} (date: ${note.last_updated})`).join('\n\n');

    // Prepare the messages for the chat
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: "Provide concise answer based on user's note"},
      { role: 'system', content: `User Notes:\n\n${context}` },
      { role: 'user', content: input },
    ];

    console.log(`messages: ${JSON.stringify(messages)}`)

    // Create chat completion
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    // Return the assistant's response
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error('Error in chatWithNotes:', error);
    throw error;
  }
}

export default generateEmbedding;