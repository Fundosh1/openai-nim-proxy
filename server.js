const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. SETTINGS & LIMITS
const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "z-ai/glm-5.1"; 

// Increase limits for GLM 5.1's heavy context
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// 2. THE PROXY ROUTE
app.post('/v1/chat/completions', async (req, res) => {
    try {
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: "Messages array is required." });
        }

        // --- HARD FORMATTING NUDGE ---
        // Attaching this to the last user message stops GLM from ignoring it over long chats.
        const lastMessageIndex = messages.length - 1;
        if (messages[lastMessageIndex].role === 'user') {
            messages[lastMessageIndex].content += 
                "\n\n[CRITICAL RULE: Write your response with clear paragraph divisions using double line breaks (\\n\\n). Do not clump all lines together into a single wall of text.]";
        }
        
        // --- CLEANED UP NVIDIA PAYLOAD ---
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            // For GLM-5.1 on NIM, 1.0 reduces token clumping and fixes formatting collapse
            temperature: temperature !== undefined ? temperature : 1.0, 
            top_p: top_p || 0.9, 
            max_tokens: max_tokens || 4096,
            stream: stream || false,
            // NIM explicitly looks for these keys inside chat_template_kwargs at the root level
            "chat_template_kwargs": {
                "thinking": true,
                "enable_thinking": true,
                "clear_thinking": true
            }
        };

        // Ensure authorization header exists before cleaning it up
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        
        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 600000 // 10 minutes
        });

        console.log(`Success: GLM 5.1 responded cleanly.`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };
        
        console.error(`Error ${status}:`, JSON.stringify(errorData));
        // Avoid crashing your frontend client by passing a structural error payload
        res.status(status).json(errorData);
    }
});

// 3. START SERVER
const server = app.listen(PORT, () => {
    console.log(`\n🚀 GLM 5.1 Bridge is LIVE on port ${PORT}`);
});

server.timeout = 600000; 
server.headersTimeout = 605000;
server.keepAliveTimeout = 605000;
