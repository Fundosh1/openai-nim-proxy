const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_ID = "deepseek/deepseek-v4-flash:free"; 

app.use(express.json({ limit: '100mb' })); // Expanded ceiling for your heavy XML prompts
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`⚡ DeepSeek V4 Flash Request Received`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        // --- DEEPSEEK V4 IMMUNITY PATTERN ---
        // V4 requires lower parameters to protect formatting structure.
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature ? Math.min(temperature, 0.85) : 0.8, // Clamp temp to prevent text loop decay
            top_p: 0.9, // Overrides Janitor's 1.0 default to lock down paragraph syntax
            max_tokens: max_tokens || 4096,
            stream: false // Disabled raw stream to cleanly strip reasoning tokens
        };

        const response = await axios({
            method: 'post',
            url: OPENROUTER_URL,
            headers: {
                'Authorization': `Bearer ${req.headers.authorization.replace('Bearer ', '')}`,
                'HTTP-Referer': 'https://janitorai.com',
                'X-Title': 'Janitor-V4-Flash-Bridge',
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 90000
        });

        // --- REASONING TOKENS EXTRACTION ---
        // If DeepSeek V4 pushes reasoning data, strip it out so it doesn't leak raw thoughts into your RP prose.
        let choice = response.data.choices[0];
        if (choice && choice.message && choice.message.content) {
            let text = choice.message.content;
            
            // Regex to cleanly scrub away internal <think></think> tags if they bleed over
            text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            response.data.choices[0].message.content = text;
        }

        res.json(response.data);

    } catch (error) {
        console.error("❌ DeepSeek Pipeline Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "V4 Flash Gateway Timeout" });
    }
});

app.listen(PORT, () => console.log(`🚀 DeepSeek V4 Flash Core operational on Port ${PORT}`));
