const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// SWAPPED: High-speed, traffic-immune open weight model on NIM
const MODEL_ID = "deepseek/deepseek-v4-flash"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Inbound Janitor -> Routing to High-Velocity DeepSeek V4 Flash...`);
        let { messages, temperature, top_p, max_tokens } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing API Key" });
        }

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.85, // Perfect balance for creative RP prose
            top_p: top_p || 0.90,             // Extra clamp to secure paragraph layout bounds
            max_tokens: max_tokens || 4096,
            stream: false                      // Kept false to bypass gateway handshake lag
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
            timeout: 60000 // Cut to 60s since V4 Flash should answer in under 5 seconds
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Connection Failed:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "NIM Route Down" });
    }
});

app.listen(PORT, () => console.log(`🚀 Velocity NIM Bridge Active on Port ${PORT}`));
