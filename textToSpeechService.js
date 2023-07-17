const textToSpeech = require('@google-cloud/text-to-speech');


const fs = require('fs');


const client = new textToSpeech.TextToSpeechClient();

module.exports = async function(text, languageCode, ssmlGender, name) {

    const request = {
        input: { text: text },
        voice: {
            languageCode: languageCode,
            ssmlGender: ssmlGender,
            name: name
        },
        audioConfig: { audioEncoding: 'LINEAR16' },
    };

    const [response] = await client.synthesizeSpeech(request);

    return response.audioContent;
}