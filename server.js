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

        // --- HARD USER LEVEL PROMPT FORCE ---
        const lastMessageIndex = messages.length - 1;
        if (messages[lastMessageIndex].role === 'user') {
            messages[lastMessageIndex].content += 
                "\n\n[Formatting Mandate: Break down your dialogue into separate lines. Use explicit paragraph breaks.]";
        }
        
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: 1.0, // High entropy required by GLM-5.1 to prevent character clumping
            top_p: 1.0, 
            max_tokens: max_tokens || 4096,
            stream: stream || false,
            // Community consensus parameters required by NVIDIA NIM to filter text blocks properly
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

        // --- THE JANITORAI INJECTION FIX ---
        // We catch the data block, dig out the raw content string, 
        // and manually replace smashed dialogue or sentence boundaries with clean layout spacing.
        if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
            let rawContent = response.data.choices[0].message.content;

            // Fix 1: Look for quotation mark transitions (dialogue blocks smashed together) and break them open
            rawContent = rawContent.replace(/(”|")\s*([A-Z])/g, '$1\n\n$2');
            
            // Fix 2: Look for compressed sentence patterns where the backend ate the trailing carriage return
            rawContent = rawContent.replace(/([.!?])\s*(?=\b[A-Z]["']?[a-z])/g, '$1\n\n');

            // Fix 3: Ensure double newline parity 
            rawContent = rawContent.replace(/\n(?!\n)/g, '\n\n');

            // Overwrite the processed string back to the body payload
            response.data.choices[0].message.content = rawContent;
        }

        console.log(`Success: GLM 5.1 layout pipeline cleaned and delivered.`);
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
