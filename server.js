const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
}));

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

app.post('/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Missing message or sessionId' });
    }

    // Initialize conversation if new
    if (!conversations[sessionId]) {
        conversations[sessionId] = [];
    }
    conversations[sessionId].push({ role: 'user', content: message });

    try {
        const completion = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: conversations[sessionId],
        });
        const botMessage = completion.data.choices[0].message.content;
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