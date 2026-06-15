Here is your brand new, completely redesigned, and fully hardened server.js proxy built specifically for GLM 5.1 on NVIDIA NIM to use with Janitor AI.

This script incorporates a strict payload sanitation shield. It cleanly extracts the required variables, entirely deletes illegal frontend tags like extra_body that trigger validation errors, and uses an active real-time data pipe to safeguard against gateway rejections and server crashes.

The Hardened GLM 5.1 NIM Proxy (server.js)
JavaScript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8080;
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// THE EXACT MODEL: Explicitly targeting Z.ai's GLM 5.1 on NVIDIA NIM
const MODEL_ID = "z-ai/glm-5.1"; 

app.use(express.json({ limit: '100mb' }));
app.use(cors());

app.post('/v1/chat/completions', async (req, res) => {
    try {
        console.log(`📡 Inbound request received. Sanitizing payload for GLM 5.1...`);
        let { messages, temperature, top_p, max_tokens, stream } = req.body;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error("❌ Error: Missing API key in Janitor Settings.");
            return res.status(401).json({ error: "Missing Authentication Header" });
        }

        // --- THE PAYLOAD FIREWALL ---
        // Explicitly copies ONLY standard properties. 
        // This strips away 'extra_body' or 'thinking' flags to completely stop 400 Bad Requests.
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
                'accept': stream ? 'text/event-stream' : 'application/json'
            },
            data: strictNvidiaBody,
            responseType: stream ? 'stream' : 'json',
            timeout: 600000 // 10-minute hold window for deep reasoning queues
        });

        if (stream) {
            // Establish clean streaming headers back to Janitor AI
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Pipe data blocks dynamically without causing server memory pool panics
            response.data.pipe(res);
            
            response.data.on('end', () => console.log(`✅ GLM 5.1 stream delivery finished.`));
        } else {
            // Standard JSON fallback 
            res.json(response.data);
        }

    } catch (error) {
        // GLOBAL SHIELD: Stops error events from taking down the whole node process
        console.error("❌ NIM Pipeline Error Intercepted:");
        
        if (error.response && error.response.data && typeof error.response.data.on === 'function') {
            error.response.data.on('data', (chunk) => {
                console.error("Raw Gateway Error Text:", chunk.toString());
            });
        } else {
            console.error(error.response?.data || error.message);
        }

        if (!res.headersSent) {
            res.status(500).json({ error: "GLM 5.1 backend exception handled safely." });
        }
    }
});

// START EXPRESS SOCKET AND UNBOUND CONNECTION IDLE DROP TIMERS
const server = app.listen(PORT, () => console.log(`🚀 Hardened GLM 5.1 NIM Bridge Online on Port ${PORT}`));
server.timeout = 600000;
server.keepAliveTimeout = 610000;
