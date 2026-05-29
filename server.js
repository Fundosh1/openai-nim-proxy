const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE TARGET: Flagship 1T-Parameter Agentic Model via NIM
const MODEL_ID = "moonshotai/kimi-k2.6"; 

app.use(express.json({ limit: '100mb' })); 
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Janitor -> NVIDIA NIM: Routing to Kimi K2.6...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error("❌ Error: Missing API key in Janitor Settings.");
            return res.status(401).json({ error: "Missing Authentication Header" });
        }

        // Kimi K2.6 shines for roleplay prose with slightly higher temp + structured constraint
        const cleanedBody = {
            model: MODEL_ID,
            messages: messages,
            temperature: temperature || 1.0, // Kimi's optimal baseline for fluid dialogue
            top_p: top_p || 0.95,             // Stabilizes paragraph formatting
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
            timeout: 180000 // 3-minute window
        });

        res.json(response.data);

    } catch (error) {
        console.error("❌ Kimi NIM Pipeline Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: "NIM Gateway Refused" });
    }
});

app.listen(PORT, () => console.log(`🚀 Kimi K2.6 NIM Bridge Fully Operational on Port ${PORT}`));
