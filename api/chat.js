import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (error) {
  console.error('Supabase client initialization error:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  if (!supabase) {
    console.error('Supabase client not initialized');
    res.status(500).json({ error: 'Database connection failed' });
    return;
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    res.status(400).json({ error: 'Missing message or sessionId' });
    return;
  }

  try {
    // Get existing conversation from Supabase
    let { data: conversation, error: fetchError } = await supabase
      .from('Conversations')
      .select('messages')
      .eq('conversation_id', sessionId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error:', fetchError);
      res.status(500).json({ error: 'Database fetch failed' });
      return;
    }

    let messages = [];
    if (conversation) {
      messages = conversation.messages;
    } else {
      // Initialize new conversation with system message
      messages = [
        { role: 'system', content: "You are a helpful chatbot. If the user tells you their name, remember it and use it in future responses. If the user asks 'Who am I?' or 'What is my name?', answer with the name they provided. If you don't know, ask them to tell you your name." }
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
      const { error: updateError } = await supabase
        .from('Conversations')
        .update({ messages: messages })
        .eq('conversation_id', sessionId);
      
      if (updateError) {
        console.error('Supabase update error:', updateError);
        res.status(500).json({ error: 'Database update failed' });
        return;
      }
    } else {
      // Insert new conversation
      const { error: insertError } = await supabase
        .from('Conversations')
        .insert({
          conversation_id: sessionId,
          messages: messages
        });
      
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        res.status(500).json({ error: 'Database insert failed' });
        return;
      }
    }

    res.status(200).json({ response: botMessage });
  } catch (error) {
    console.error('General error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
} 