const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "moonshotai/kimi-k2.6";

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Intercepting stream request for Kimi K2.6...`);
        let { messages, temperature, top_p, max_tokens } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing Authentication Header" });
        }

        // FORCE stream to false to completely bypass the NIM gateway streaming block
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 1.0,
            top_p: top_p || 0.95,
            max_tokens: max_tokens || 4096,
            stream: false 
        };

        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                'Authorization': authHeader.startsWith('Bearer') ? authHeader : `Bearer ${authHeader}`,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            data: cleanedBody,
            timeout: 180000
        });

        // If Janitor requested a stream, convert NVIDIA's solid response into an OpenAI-style text stream
        if (req.body.stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const content = response.data.choices[0]?.message?.content || "";
            
            // Construct the exact data packet Janitor expects
            const chunk = {
                id: response.data.id || "chatcmpl-kimi",
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: MODEL_ID,
                choices: [{
                    index: 0,
                    delta: { content: content },
                    finish_reason: "stop"
                }]
            };

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            // Standard JSON fallback
            res.json(response.data);
        }

    } catch (error) {
        console.error("❌ NIM Kimi Stream Handler Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Streaming pipeline failure" });
    }
});

app.listen(PORT, () => console.log(`🚀 Gateway-Immune Kimi Bridge Active on Port ${PORT}`));
