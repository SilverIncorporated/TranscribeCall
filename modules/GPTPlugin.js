const OpenAi  = require('openai');
const openaiapi = OpenAi.OpenAIApi;
const Configuration = OpenAi.Configuration;
require("dotenv").config();
const { log } = require("console");

module.exports = {
    GPTPlugin: class GPTPlugin {
        constructor() {
            this.modelId = "gpt-3.5-turbo";
            this.currentMessages = [
                {
                    role:'system',
                    content:'You are a healthcare assistant named Doc Robot'
                },
                {
                    role:'system',
                    content:'This is a phone call, keep responses short, ideally to one sentence'
                }
            ];
            var configuration = new Configuration( {
                apiKey: process.env.OAI_APIKEY
            });
            this.openai = new openaiapi(configuration);
            this.functions =[]
            this.callbacks = {};
        }
        async GenerateResponse(prompt) {
            const promptText = `${prompt}\n\nResponse:`;
            this.currentMessages.push({role:'user', content:prompt});
            var result = await this.openai.createChatCompletion({
                model: this.modelId,
                messages: this.currentMessages,
                functions: this.functions,
                function_call:"auto"
            })
            if(result.data.choices[0].message.function_call) {
                var functionCall = result.data.choices[0].message.function_call;
                log(`Agent Action: Calling function ${functionCall.name}`)
                this.currentMessages.push(
                    {
                        'role': 'function',
                        'name': 'get_current_weather',
                        'content': JSON.stringify({
                            'location': 'Boston',
                            'temperature': '72',
                            'unit': 'Celsius',
                            'forecast': ['sunny','windy']
                        })
                    }
                )
                result = await this.openai.createChatCompletion({
                    model: this.modelId,
                    messages: this.currentMessages,
                    functions: this.functions,
                    function_call:"auto"
                })
            }
            const responseText = result.data.choices[0].message.content;
            this.currentMessages.push({role:'assistant', content:responseText});
            return responseText;
        }
        RegisterFunction(func, callback) {
            this.functions.push(func);
            this.callbacks[func.name] = callback;
        }
    }
}