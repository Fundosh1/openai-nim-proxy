const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;

// NVIDIA NIM URL & MODEL TARGET
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "openai/gpt-oss-120b"; // Massive 120B model hosted directly on NIM

app.use(express.json({ limit: '100mb' })); // Protects large XML custom prompts from truncation
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Inbound Janitor -> Pure NVIDIA NIM Request...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        // Ensure authorization header is forwarded flawlessly to avoid 401/500 missing headers
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error("❌ Error: Janitor sent an empty API key field.");
            return res.status(401).json({ error: "Missing Authentication Header from Janitor AI" });
        }

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.85, // Keeps your creative prose vivid
            top_p: top_p || 0.95,              // Preserves structural layout boundary rules
            max_tokens: max_tokens || 4096,
            stream: stream || false
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
            timeout: 180000 // 3-minute timeout window
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Pipeline Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "NIM Connection Refused" });
    }
});

app.listen(PORT, () => console.log(`🚀 Pure NVIDIA NIM Bridge Online on Port ${PORT}`));
