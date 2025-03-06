import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export async function getEmbedding(content: string) {
  try {
    const response = await fetch('https://memento-backend-two.vercel.app/api/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }), // Send content as JSON body
    });

    // Check if the response is successful (status 200)
    if (!response.ok) {
      throw new Error('Failed to fetch embedding');
    }

    // Parse the response as JSON
    const data = await response.json();

    // Extract the embedding
    const embedding = data.embedding;

    // Return the embedding or use it for further processing
    return embedding;
  } catch (error) {
    console.error('Error:', error);
    // Handle the error appropriately (e.g., show an error message to the user)
    return null;
  }
}

export async function chatWithNotes(input: string, context: string) {
  try {
    const offset = new Date().getTimezoneOffset();
    const localTime = new Date(new Date().getTime() - offset * 60000).toISOString();

    // Prepare the messages for the chat
    // TODO: maybe use RAG for instructions as well?
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: "Provide concise answer based on user's notes"},
      { role: 'system', content: "- If user ask duration, calculate the time by subtracting the finish time by the start time" },
      { role: 'system', content: `
        - If user ask for a plan, layout exactly when to do what 
        (e.g. 
        \`15:00-16:00\` 
        Read book
        \`16:00-17:00\` 
        Gym Workout
        )
        ` },
      { role: 'system', content: `The current time is: ${localTime}` },
      { role: 'system', content: `User Notes:\n\n${context}` },
      { role: 'user', content: input },
    ];

    console.log(`messages: ${JSON.stringify(messages)}`)

    const chatCompletionResponse = await fetch('https://memento-backend-two.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    
    // Check if the response is OK (status 200)
    if (!chatCompletionResponse.ok) {
      throw new Error('Failed to get a valid response from the server');
    }
    
    // Parse the response body as JSON
    const response = await chatCompletionResponse.json();
    
    // Return the assistant's response
    return response.content;
  } catch (error) {
    console.error('Error in chatWithNotes:', error);
    throw error;
  }
}