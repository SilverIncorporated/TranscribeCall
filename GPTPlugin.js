const OpenAi  = require('openai');
const openaiapi = OpenAi.OpenAIApi;
const Configuration = OpenAi.Configuration;
require("dotenv").config();
const { log } = require("console");

const configuration = new Configuration( {
    apiKey: process.env.OAI_APIKEY
});

const openai = new openaiapi(configuration);

const conversationContext = [];
const currentMessages = [];

module.exports = async function(prompt) {

    //log(`Generating response to: ${prompt}`)

    const modelId = "gpt-3.5-turbo";
    const promptText = `${prompt}\n\nResponse:`;

    for (const [inputText, responseText] of conversationContext) {
        currentMessages.push({role: 'user', content: inputText});
        currentMessages.push({role: 'assistant', content:responseText});
    }

    currentMessages.push({role:'user',content:promptText});

    const result = await openai.createChatCompletion({
        model: modelId,
        messages: currentMessages
    })

    const responseText = result.data.choices.shift().message.content;
    conversationContext.push([promptText,responseText]);

    return responseText;

    
}