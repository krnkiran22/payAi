import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

async function testVision() {
    try {
        // Based on user's hint: we need to use this
        // But the user's snippet used .responses.create which might be unique to Groq's implementation of multimodal
        const response = await client.responses.create({
            model: 'openai/gpt-oss-20b',
            input: "Is this a test?",
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Error:', err);
    }
}

testVision();
