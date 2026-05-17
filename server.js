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

        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: "Messages array is required." });
        }

        // --- FIX 1: OVERRIDE JANITOR'S HIDDEN MAX_TOKENS ---
        // Janitor often passes a small max_tokens value (like 500-1000) behind the scenes.
        // For GLM-5.1 on NIM, this cuts off sentences mid-thought because reasoning burns tokens.
        // We force a high cap here so it never cuts off.
        const forcedMaxTokens = 4096;

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: 1.0, 
            top_p: 1.0, 
            max_tokens: forcedMaxTokens,
            stream: false, // Explicitly false for clean payload processing
            "chat_template_kwargs": {
                "thinking": true,
                "enable_thinking": true,
                "clear_thinking": true,
                "do_sample": true
            }
        };

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
            timeout: 600000 
        });

        // --- FIX 2: INTELLIGENT PARAGRAPH PARSING ---
        if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
            let rawContent = response.data.choices[0].message.content;

            // 1. First, normalize any weird spacing the model returned
            rawContent = rawContent.replace(/\r\n/g, '\n');

            // 2. Separate dialogue safely: ONLY split if a quote ends and a completely new sentence starts.
            // This prevents cutting off sentences that include commas or action tags.
            rawContent = rawContent.replace(/(”|")\s+(?=[A-Z])/g, '$1\n\n');

            // 3. Fix paragraph clumping safely: Only add breaks after structural terminal punctuation (.!?) 
            // followed directly by a space and a capital letter, ensuring it's an absolute sentence boundary.
            rawContent = rawContent.replace(/([.!?])\s+(?=[A-Z\s]["']?[A-Z])/g, '$1\n\n');

            // 4. Clean up any accidental triple-spacing created by the logic
            rawContent = rawContent.replace(/\n{3,}/g, '\n\n');

            response.data.choices[0].message.content = rawContent;
        }

        console.log(`Success: GLM 5.1 advanced formatting delivered layout smoothly.`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };
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
