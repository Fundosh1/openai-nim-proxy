const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE EXACT MODEL: Explicitly targeting Moonshot Kimi 2.6 on NIM
const MODEL_ID = "moonshotai/kimi-k2.6"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Request received. Forcing connection to remain open for Kimi 2.6...`);
        let { messages, temperature, top_p, max_tokens } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing API Key" });
        }

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 1.0, 
            top_p: top_p || 0.95,             
            max_tokens: max_tokens || 4096,
            stream: false // Strictly false to secure gateway passage on NIM
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
            // AXIOS TIMEOUT EXTENSION: 10 full minutes to clear heavy queue bottlenecks
            timeout: 600000 
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Kimi 2.6 Route Failed:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Kimi 2.6 Connection Denied" });
    }
});

// NODE NETWORK SERVER IMPLEMENTATION
const server = app.listen(PORT, () => console.log(`🚀 Dedicated Kimi 2.6 NIM Bridge Active on Port ${PORT}`));

// HARDWARE SOCKET UNBOUND: Overrides Node's native 2-3 minute connection drops
server.timeout = 600000;          // 10 minutes max execution hold
server.keepAliveTimeout = 610000; // Keeps communication wire open past the timeout window
