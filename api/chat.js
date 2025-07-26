import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    res.status(400).json({ error: 'Missing message or sessionId' });
    return;
  }

  try {
    // Get existing conversation from Supabase
    let { data: conversation, error } = await supabase
      .from('Conversations')
      .select('messages')
      .eq('conversation_id', sessionId)
      .single();

    let messages = [];
    if (conversation) {
      messages = conversation.messages;
    } else {
      // Initialize new conversation with system message
      messages = [
        { role: 'system', content: "You are a helpful chatbot. If the user tells you their name, remember it and use it in future responses. If the user asks 'Who am I?' or 'What is my name?', answer with the name they provided. If you don't know, ask them to tell you their name." }
      ];
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });
    const botMessage = completion.choices[0].message.content;
    messages.push({ role: 'assistant', content: botMessage });

    // Save/update conversation in Supabase
    if (conversation) {
      // Update existing conversation
      await supabase
        .from('Conversations')
        .update({ messages: messages })
        .eq('conversation_id', sessionId);
    } else {
      // Insert new conversation
      await supabase
        .from('Conversations')
        .insert({
          conversation_id: sessionId,
          messages: messages
        });
    }

    res.status(200).json({ response: botMessage });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
} 