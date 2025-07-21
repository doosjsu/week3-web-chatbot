const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static files (including index.html) from the current directory
const path = require('path');
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

app.post('/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Missing message or sessionId' });
    }

    // Initialize conversation if new
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
        res.json({ response: botMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get response from OpenAI' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}); 