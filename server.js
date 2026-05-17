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

        // --- CALIBRATED FORMATTING NUDGE ---
        const lastMessageIndex = messages.length - 1;
        if (messages[lastMessageIndex].role === 'user') {
            messages[lastMessageIndex].content += 
                "\n\n[Formatting Instruction: Write cleanly. Separate dialogue and paragraphs normally.]";
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

        // --- THE LAYOUT STABILIZER ---
        if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
            let rawContent = response.data.choices[0].message.content;

            // Step 1: Standardize all erratic line breaks into single uniform newlines (\n)
            rawContent = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Step 2: Separate smashed dialogue blocks ONLY if they lack spacing entirely
            // Example: "Hello."She said -> "Hello."\n\nShe said
            rawContent = rawContent.replace(/(”|")([A-Z])/g, '$1\n\n$2');

            // Step 3: Fix double spacing issues by converting any sequence of 3 or more newlines down to a perfect \n\n
            rawContent = rawContent.replace(/\n{3,}/g, '\n\n');

            // Step 4: Ensure single stray lines get given proper paragraph status without blowing out spacing
            rawContent = rawContent.replace(/(?<!\n)\n(?!\n)/g, '\n\n');

            // Step 5: Final pass sanitation sweep to remove any accidental duplicate whitespace groupings
            rawContent = rawContent.replace(/\n{3,}/g, '\n\n').trim();

            // Push the sanitized text layout back to JanitorAI
            response.data.choices[0].message.content = rawContent;
        }

        console.log(`Success: GLM 5.1 formatting stabilized.`);
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
