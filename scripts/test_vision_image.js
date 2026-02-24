import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

async function testVision() {
    try {
        const imagePath = './tmp/test_image.jpg'; // We need an actual image
        // Create a dummy image if not exists or just use a remote URL

        const response = await client.responses.create({
            model: 'openai/gpt-oss-20b',
            input: [
                { type: 'text', text: "What's in this image?" },
                {
                    type: 'image',
                    image: fs.readFileSync('./tmp/test_image.jpg').toString('base64')
                }
            ],
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Error:', err);
    }
}
