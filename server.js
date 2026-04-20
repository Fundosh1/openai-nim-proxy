const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. SETTINGS & LIMITS
const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Fix "Payload Too Large" - Set to 50MB for huge context
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Fix "Network Error" - Allow Janitor AI to communicate
app.use(cors());

// 2. THE PROXY ROUTE
app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`--- New Request Received ---`);

        // Strip Janitor AI's extra fields that cause NVIDIA "Invalid Request" errors
        const { model, messages, temperature, top_p, max_tokens, stream } = req.body;

        const cleanedBody = {
            model: "moonshotai/kimi-k2.5", // Correct 2026 NVIDIA ID
            messages: messages,
            temperature: temperature || 0.9,
            top_p: top_p || 1.0,
            max_tokens: max_tokens || 4096,
            stream: stream || false
        };

        // Forward to NVIDIA
        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                // This takes the key you put in Janitor AI's API Key box
                'Authorization': req.headers.authorization.startsWith('Bearer') 
                    ? req.headers.authorization 
                    : `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 300000 // 5-minute timeout for Kimi's deep thinking
        });

        console.log(`Success: Response received from NVIDIA`);
        res.json(response.data);

    } catch (error) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || error.message;
        
        console.error(`Error ${status}:`, JSON.stringify(errorData));
        res.status(status).json(errorData);
    }
});

// 3. START SERVER (Unified - No double listen!)
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Kimi 2.5 Bridge is LIVE on port ${PORT}`);
    console.log(`Janitor AI Proxy URL: https://openai-nim-proxy-production-d3e5.up.railway.app/v1/chat/completions\n`);
});

// Set global server timeouts for massive lore files
server.timeout = 600000; 
server.headersTimeout = 605000;
server.keepAliveTimeout = 605000;
