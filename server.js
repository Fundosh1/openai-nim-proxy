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

        // --- THE JANITORAI JUMP NUDGE ---
        // JanitorAI strips early system prompts. Forcing it as an explicit user instruction 
        // at the end of the payload prevents paragraph compression.
        const lastMessageIndex = messages.length - 1;
        if (messages[lastMessageIndex].role === 'user') {
            messages[lastMessageIndex].content += 
                "\n\n[Formatting Instruction: Output your response with explicit dual line breaks (\\n\\n) between paragraphs. Never combine dialogue and narration into a single block.]";
        }
        
        // --- BACKEND SPECIFIC DATA MAP ---
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            // GLM 5.1 on NIM collapses whitespace if temp is below 1.0
            temperature: 1.0, 
            top_p: 1.0, // Keeping top_p high lets formatting characters pass through
            max_tokens: max_tokens || 4096,
            stream: stream || false,
            // Exact parameter string required by NIM architecture to split the text blocks properly
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

        console.log(`Success: GLM 5.1 formatting pipeline passed.`);
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
