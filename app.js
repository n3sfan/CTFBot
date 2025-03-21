import express from 'express';
import {
    InteractionType,
    InteractionResponseType,
    verifyKeyMiddleware
} from 'discord-interactions';
import { setup, updateGuildEvents, createChannel } from './discord.js';
import { registerAccount } from './ctfd.js';

const app = express();
const PORT = process.env.PORT || 3000;
var GUILD_ID = process.env.GUILD_ID; // TODO read from file
const CTF_EMAIL = process.env.CTF_EMAIL;
const CTF_NAME = process.env.CTF_NAME;

// getGuildCTFEvents();
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@!#$%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) { 
    // Interaction type and data
    const { type, id, data } = req.body;

    if (type === InteractionType.PING)
        return res.send({ type: InteractionResponseType.PONG });

    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name, options } = data;

        if (name === 'ctfcreate') {
            var [channel, e] = await createChannel(GUILD_ID, options[0].value.trim());
            if (!channel) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'CTF not found'
                    }
                });
            }
            
            var url = e.entity_metadata.location.slice(e.entity_metadata.location.indexOf('@') + 1).trim();
            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }
            // console.log(url);
            var pass = generateRandomString(12);
            
            var registerOk = await registerAccount(url, {
                'name': CTF_NAME,
                'email': CTF_EMAIL,
                'password': pass,
            });
            if (registerOk) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `\`\`\`
                        ${url}
                        name: ${CTF_NAME}
                        pass: ${pass}
                        \`\`\``
                    }
                });
            } else {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Not CTFd, khong tao duoc account'
                    }
                });
            }
        }
    }
})

app.listen(PORT, () => {
    console.log(`Bot is running on port ${PORT}`);
});

// console.log('guild ' + GUILD_ID);

await setup(GUILD_ID);
console.log("Setup ok!");

updateGuildEvents(GUILD_ID);
var guid = setInterval(async () => {
    updateGuildEvents(GUILD_ID);
}, 1000 * 60 * 60 * 24 * 2); // 2 days
console.log("Done!");