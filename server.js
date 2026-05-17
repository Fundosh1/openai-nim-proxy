const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "z-ai/glm-5.1"; 

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        // --- FIXED FORMATTING NUDGE ---
        // GLM-5.1 often ignores system prompts if the frontend overrides them.
        // Instead, we inject a high-priority "instruction pair" right before the last user message.
        if (messages && messages.length > 0) {
            const lastMessageIndex = messages.length - 1;
            if (messages[lastMessageIndex].role === 'user') {
                messages[lastMessageIndex].content += 
                    "\n\n[CRITICAL FORMATTING RULE: You must output your response with clear paragraph breaks using dual line breaks (\\n\\n). Strip all internal thought tags from your final visible text. Do not clump lines together.]";
            }
        }

        // --- FIXED NVIDIA NIM PAYLOAD STRUCTURE ---
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            // GLM-5.1 on NIM requires high temperature (1.0) to prevent token clumping and formatting collapse
            temperature: 1.0, 
            top_p: top_p || 0.9, 
            max_tokens: max_tokens || 4096,
            stream: stream || false,
            
            // NVIDIA NIM specific structural placement for parameter passthroughs
            "chat_template_kwargs": {
                "enable_thinking": false, // Set to false if you want the API layer to completely drop the reasoning phase and output pure text paragraphs
                "clear_thinking": true
            }
        };
        
        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                'Authorization': req.headers.authorization?.startsWith('Bearer') 
                    ? req.headers.authorization 
                    : `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json'
            ',
            data: cleanedBody,
            timeout: 600000 
        });

        console.log(`Success: GLM 5.1 formatting pipeline passed.`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || error.message;
        
        console.error(`Error ${status}:`, JSON.stringify(errorData));
        res.status(status).json(errorData);
    }
});

const server = app.listen(PORT, () => {
    console.log(`\n🚀 GLM 5.1 Bridge is LIVE on port ${PORT}`);
});

server.timeout = 600000; 
server.headersTimeout = 605000;
server.keepAliveTimeout = 605000;
