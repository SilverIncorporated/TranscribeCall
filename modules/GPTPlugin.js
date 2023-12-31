const OpenAi  = require('openai');
const openaiapi = OpenAi.OpenAIApi;
const Configuration = OpenAi.Configuration;
require("dotenv").config();
const { log } = require("console");

module.exports = {
    GPTPlugin: class GPTPlugin {
        constructor() {
            this.modelId = "gpt-3.5-turbo";
            var configuration = new Configuration( {
                apiKey: process.env.OAI_APIKEY
            });
            this.openai = new openaiapi(configuration);
            this.Init()
        }

        Init() {
            this.functions = []
            this.callbacks = {};
            this.currentMessages = [
                {
                    role:'system',
                    content:`You are a healthcare assistant named Doc Robot\ngive one sentence responses\ndo not assume the input for functions you call\nalways ask if you are not given an input for a function\ndo not use example values for arguments in functions\nalways give required input arguments for functions\nask for function arguments one at a time\nonly use the functions provided to you\ntoday's date is${new Date()}`
                }
            ];
        }
        
        async GenerateResponse(prompt) {
            this.currentMessages.push({role:'user', content:prompt});
            var responseText=""
            if (this.functions.length > 0) {
                var result = await this.openai.createChatCompletion({
                    model: this.modelId,
                    messages: this.currentMessages,
                    functions: this.functions,
                    function_call:"auto"
                });
                if(result.data.choices[0].message.function_call) {
                    var functionCall = result.data.choices[0].message.function_call;
                    log(`Action: Calling function ${functionCall.name}`)
                    this.callbacks[functionCall.name](functionCall);
                    responseText="I am calling an external service.";
                }
                else {responseText = result.data.choices[0].message.content;}
            } else {
                var result = await this.openai.createChatCompletion({
                    model: this.modelId,
                    messages: this.currentMessages
                });
                responseText = result.data.choices[0].message.content;
                this.currentMessages.push({role:'assistant', content:responseText});
            }
            return responseText;
        }
        RegisterFunction(func, callback) {
            this.functions.push(func);
            this.callbacks[func.name] = callback;
            log(`Function registered:\n${JSON.stringify(func)}`)
        }
        ClearFunctions() {
            this.functions = []
        }
        async FunctionCompletion(name, result) {
            this.currentMessages.push(
                {
                    role:"function",
                    name:name,
                    content:JSON.stringify(result)
                }
            )
            var response = await this.openai.createChatCompletion({
                model: this.modelId,
                messages: this.currentMessages
            });
            var responseText = response.data.choices[0].message.content;
            if(responseText != null) {
                this.currentMessages.push({role:'assistant', content:responseText});
            }
            
            return responseText;
        }
    }
}