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

        // --- STEP 1: ANALYZE THE EXISTING CHAT STYLE ---
        let usesDoubleNewlines = true; 
        let sampleText = "";

        // Look backward through history to find the most recent long bot or user message to sample style from
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].content && messages[i].content.length > 100) {
                sampleText = messages[i].content;
                break;
            }
        }

        if (sampleText) {
            // Count double newlines (\n\n) vs single newlines (\n)
            const doubleCount = (sampleText.match(/\n\n/g) || []).length;
            const singleCount = (sampleText.match(/(?<!\n)\n(?!\n)/g) || []).length;
            
            // If the chat context predominantly uses single line breaks, adapt to that style
            if (singleCount > doubleCount * 1.5) {
                usesDoubleNewlines = false;
            }
        }

        // --- STEP 2: REINFORCE STYLE IN PROMPT ---
        const styleInstruction = usesDoubleNewlines 
            ? "Maintain the current layout style. Use clear double line breaks (\\n\\n) between separate narrative paragraphs and dialogue blocks."
            : "Maintain the current layout style. Keep text tighter using single line breaks (\\n) for shifts in dialogue or action.";

        const lastMessageIndex = messages.length - 1;
        if (messages[lastMessageIndex].role === 'user') {
            messages[lastMessageIndex].content += `\n\n[Style Match Mandate: ${styleInstruction}]`;
        }
        
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: 1.0, 
            top_p: 1.0, 
            max_tokens: max_tokens || 4096,
            stream: stream || false,
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

        // --- STEP 3: ADAPTIVE POST-PROCESSING CLEANUP ---
        if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
            let rawContent = response.data.choices[0].message.content;

            // Standardize basic formatting first
            rawContent = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            if (usesDoubleNewlines) {
                // Style A: Fix clumping into clean double spaces, crush accidental triple spaces
                rawContent = rawContent.replace(/(”|")([A-Z])/g, '$1\n\n$2');
                rawContent = rawContent.replace(/(?<!\n)\n(?!\n)/g, '\n\n');
                rawContent = rawContent.replace(/\n{3,}/g, '\n\n');
            } else {
                // Style B: The chat history prefers compact single lines. Collapse double-breaks down to singles.
                rawContent = rawContent.replace(/\n{2,}/g, '\n');
                // Ensure tight dialogue blocks look clean
                rawContent = rawContent.replace(/(”|")([A-Z])/g, '$1\n$2');
            }

            response.data.choices[0].message.content = rawContent.trim();
        }

        console.log(`Success: GLM 5.1 dynamically matched chat style (Double Spacing: ${usesDoubleNewlines}).`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };
        console.error(`Error ${status}:`, JSON.stringify(errorData));
        res.status(status).json(errorData);
    }
});

const server = app.listen(PORT, () => {
    console.log(`\n🚀 GLM 5.1 Style-Matcher Bridge is LIVE`);
});

server.timeout = 600000; 
server.headersTimeout = 605000;
server.keepAliveTimeout = 605000;
