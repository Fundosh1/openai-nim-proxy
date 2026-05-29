const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// DEFAULT MODEL: Set to GPT-OSS 120B for rock-solid stability and prose depth
const MODEL_ID = "openai/gpt-oss-120b:free"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📦 Request routed through High-Throughput Bridge`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const cleanedBody = {
            model: MODEL_ID, // Connects to the model defined above
            messages: messages,
            temperature: temperature || 0.85, // Perfect balance for creative RP prose
            top_p: 0.95,                      // Retains high vocabulary variation
            max_tokens: max_tokens || 4096,
            stream: stream || false
        };

        const response = await axios({
            method: 'post',
            url: OPENROUTER_URL,
            headers: {
                'Authorization': `Bearer ${req.headers.authorization.replace('Bearer ', '')}`,
                'HTTP-Referer': 'https://janitorai.com',
                'X-Title': 'Janitor-Stable-Bridge',
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 180000 // 3-minute timeout cushion
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ Proxy Bridge Failure:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Traffic Timeout" });
    }
});

app.listen(PORT, () => console.log(`🚀 High-Throughput Proxy Active on Port ${PORT}`));
