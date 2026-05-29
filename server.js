const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Fully qualified model path to bypass gateway validation drops
const MODEL_ID = "moonshotai/kimi-k2.6"; 

app.use(express.json({ limit: '100mb' })); 
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Inbound Janitor -> Hardened NVIDIA NIM: Routing to Kimi K2.6...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error("❌ Error: Missing API key in Janitor Settings.");
            return res.status(401).json({ error: "Missing Authentication Header" });
        }

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 1.0, 
            top_p: top_p || 0.95,             
            max_tokens: max_tokens || 4096,
            stream: stream || false
        };

        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                // Strictly enforces standard Bearer token generation to pass gateway firewalls
                'Authorization': authHeader.startsWith('Bearer') ? authHeader : `Bearer ${authHeader}`,
                'Content-Type': 'application/json',
                'accept': 'application/json' // CRITICAL: Forces gateway acknowledgment
            },
            data: cleanedBody,
            timeout: 180000 
        });

        res.json(response.data);

    } catch (error) {
        // Log detailed payload logs to pinpoint exact validation rejections
        console.error("❌ NIM Gateway Rejection Details:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "NIM Gateway Refused Stream" });
    }
});

app.listen(PORT, () => console.log(`🚀 Secure Kimi K2.6 NIM Bridge Active on Port ${PORT}`));
