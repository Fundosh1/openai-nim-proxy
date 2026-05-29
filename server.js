const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. SETTINGS & LIMITS
const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "z-ai/glm-5.1"; // Verified 2026 NVIDIA ID

// Increase limits for GLM 5.1's 200k+ context capacity
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// 2. THE PROXY ROUTE
app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`--- GLM 5.1 Request Inbound ---`);

        // Extract Janitor AI fields
        const { messages, temperature, top_p, max_tokens, stream } = req.body;

        // GLM 5.1 works best with specific reasoning toggles
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.7,
            top_p: top_p || 0.95, // GLM 5.1 prefers 0.95 over 1.0 for stability
            max_tokens: max_tokens || 16384, // GLM 5.1 supports large outputs
            stream: stream || false,
            // 2026 GLM Features: Enable thinking/reasoning mode
            extra_body: {
                "chat_template_kwargs": {
                    "enable_thinking": true,
                    "clear_thinking": false
                }
            }
        };

        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                'Authorization': req.headers.authorization.startsWith('Bearer') 
                    ? req.headers.authorization 
                    : `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 600000 // 10-minute timeout (Reasoning models can be slow)
        });

        console.log(`Success: GLM 5.1 responded.`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || error.message;
        
        console.error(`Error ${status}:`, JSON.stringify(errorData));
        res.status(status).json(errorData);
    }
});

// 3. START SERVER
const server = app.listen(PORT, () => {
    console.log(`\n🚀 GLM 5.1 Bridge is LIVE on port ${PORT}`);
});

// Vital for long reasoning tasks
server.timeout = 600000; 
server.headersTimeout = 605000;
server.keepAliveTimeout = 605000;
