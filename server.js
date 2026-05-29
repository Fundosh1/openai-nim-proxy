const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE TARGET: High-efficiency, rich prose narrative king on NIM
const MODEL_ID = "nvidia/llama-3.3-nemotron-super-49b-v1.5"; 

app.use(express.json({ limit: '100mb' })); 
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Inbound Janitor -> NVIDIA Nemotron Super RP Request...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error("❌ Error: Authorization header missing from Janitor.");
            return res.status(401).json({ error: "Missing Authentication Header" });
        }

        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 0.9, // Slightly higher temp lets Nemotron get incredibly vivid
            top_p: top_p || 0.95,             // Perfect token constraint for structural layouts
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
            timeout: 180000 
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ NIM Pipeline Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "NIM Link Severed" });
    }
});

app.listen(PORT, () => console.log(`🚀 Nemotron Super RP Bridge Active on Port ${PORT}`));
