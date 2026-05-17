const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. CHOOSE YOUR LLAMA TARGET
const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "meta/llama-3.3-70b-instruct"; // Clean paragraph king

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// 2. PROXY ROUTE
app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`--- Llama 3.3 Request Inbound ---`);
        const { messages, temperature, top_p, max_tokens, stream } = req.body;

        // Structured cleanly to respect prose rules and avoid gibberish loop logic
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.7, 
            top_p: top_p || 0.9, // Kept tight for prose formatting structure
            max_tokens: max_tokens || 4096, 
            stream: stream || false
        };

        const response = await axios({
            method: 'post',
            url: NVIDIA_URL,
            headers: {
                'Authorization': req.headers.authorization.startsWith('Bearer') 
                    ? req.headers.authorization 
                    : `Bearer ${req.headers.authorization}`,
                'Content-Type': 'application/json'
            },
            data: cleanedBody,
            timeout: 120000 // 2 minute timeout (Llama is snappy)
        });

        res.json(response.data);

    } catch (error) {
        console.error(`NIM Proxy Error:`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Proxy Pipeline Error" });
    }
});

// 3. LAUNCH
app.listen(PORT, () => console.log(`🚀 Llama NIM Bridge Operational on Port ${PORT}`));
