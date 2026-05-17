const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. SETTINGS FOR GEMMA 4 NIM
const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = "google/gemma-4-31b-it"; 

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// 2. NIM PROXY PIPELINE
app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`--- Gemma 4 31B Request Received ---`);
        const { messages, temperature, top_p, max_tokens, stream } = req.body;

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.8, // Gemma shines at 0.8 for vivid storytelling
            top_p: top_p || 0.95,           // Keeps the structural token boundaries clean
            max_tokens: max_tokens || 8192,  // Generates expansive descriptions if allowed
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
            // CHANGE THIS: Gives the server up to 5 full minutes 
            // to wait out the queue traffic before throwing an error.
            timeout: 300000 
        });

        res.json(response.data);

    } catch (error) {
        console.error(`NIM Proxy Error:`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Proxy Pipeline Error" });
    }
});

// 3. LISTEN
app.listen(PORT, () => console.log(`🚀 Gemma 4 NIM Bridge Active on Port ${PORT}`));
