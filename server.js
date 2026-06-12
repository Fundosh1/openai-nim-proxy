const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE TARGET: GLM 5.1 on the official NVIDIA NIM tier
const MODEL_ID = "THUDM/glm-5.1"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Filtering payload for GLM 5.1...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing API Key" });
        }

        // --- THE SANITATION SHIELD ---
        // We explicitly build a clean object with ONLY the parameters NIM officially supports.
        // This completely strips 'extra_body', 'thinking', or any other frontend parameters that cause 400 errors.
        const strictNvidiaBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.9,
            top_p: top_p || 0.95,
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
            data: strictNvidiaBody, // Sends ONLY the strictly allowed parameters
            timeout: 180000 
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Payload Rejection:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Payload verification failed" });
    }
});

app.listen(PORT, () => console.log(`🚀 Strict Payload Sanitation Bridge Active on Port ${PORT}`));const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE TARGET: GLM 5.1 on the official NVIDIA NIM tier
const MODEL_ID = "THUDM/glm-5.1"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Filtering payload for GLM 5.1...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Missing API Key" });
        }

        // --- THE SANITATION SHIELD ---
        // We explicitly build a clean object with ONLY the parameters NIM officially supports.
        // This completely strips 'extra_body', 'thinking', or any other frontend parameters that cause 400 errors.
        const strictNvidiaBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.9,
            top_p: top_p || 0.95,
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
            data: strictNvidiaBody, // Sends ONLY the strictly allowed parameters
            timeout: 180000 
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Payload Rejection:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "Payload verification failed" });
    }
});

app.listen(PORT, () => console.log(`🚀 Strict Payload Sanitation Bridge Active on Port ${PORT}`));
