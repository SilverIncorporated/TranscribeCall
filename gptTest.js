let GPTPlugin = require('./GPTPlugin')
let ChatGPT = GPTPlugin.GPTPlugin;
const { log } = require("console");

async function Test()
{
    var gpt = new ChatGPT();
    var choices = await gpt.GenerateResponse("Introduce yourself")
    log(choices)
    var choices = await gpt.GenerateResponse("What is the weather?")
    log(choices)
    var choices = await gpt.GenerateResponse("Boston")
    log(choices)
}
Test()