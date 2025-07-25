import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

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
  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      { role: 'system', content: "You are a helpful chatbot. If the user tells you their name, remember it and use it in future responses. If the user asks 'Who am I?' or 'What is my name?', answer with the name they provided. If you don't know, ask them to tell you their name." }
    ];
  }
  conversations[sessionId].push({ role: 'user', content: message });
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversations[sessionId],
    });
    const botMessage = completion.choices[0].message.content;
    conversations[sessionId].push({ role: 'assistant', content: botMessage });
    res.status(200).json({ response: botMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
} 