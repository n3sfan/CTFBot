import { ChannelTypes } from "discord-interactions";
import { getEventsInWeek } from './ctftime.js';

const BOT_URL = process.env.BOT_URL;
const USER_AGENT = `DiscordBot (${BOT_URL}, 1.0)`;
const AUTH_HEADERS = {
    Authorization: 'Bot ' + process.env.DISCORD_TOKEN,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json' 
};
const PLAYER_ROLES_NAMES = ['CTF-Blackpinker', 'Media'];

var EVERYONE_ROLE_ID = '';
var PLAYER_ROLES_IDS = [];
var BOT_USER_ID = '';
var PARENT_CHANNEL = '';

var lastAPICall = 0;
var guildEvents = [];

/**
 * Discord rate limit prevention
 * TODO: Fix
 */
function checkRateLimit(delay = 5000) {
    while (Date.now() - lastAPICall < delay) {}
    lastAPICall = Date.now();
}

export async function setup(guildId) {
    // Role
    checkRateLimit();
    var response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: 'GET',
        headers: AUTH_HEADERS
    });
    var roles = await response.json();
    for (let role of roles) {
        if (role.name === '@everyone') {
            EVERYONE_ROLE_ID = role.id;
        } else if (PLAYER_ROLES_NAMES.includes(role.name)) {
            PLAYER_ROLES_IDS.push(role.id);
        }
    }

    // User
    checkRateLimit();
    var response = await fetch(`https://discord.com/api/v10/users/@me`, {
        method: 'GET',
        headers: AUTH_HEADERS
    });
    var user = await response.json();
    // console.log(user);
    BOT_USER_ID = user.id;

    // Channel
    checkRateLimit();
    var response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: 'GET',
        headers: AUTH_HEADERS
    });
    var channels = await response.json();
    // console.log(channels);
    PARENT_CHANNEL = channels.find(c => c.name.toLowerCase() === process.env.CTF_CATEGORY.toLowerCase()).id;
}   

/**
 * Update guild calendar with CTF events happening now to next week.
 * @param {*} guildId 
 */
export async function updateGuildEvents(guildId) {
    guildEvents = await getGuildCTFEvents(guildId);
    var events = (await getEventsInWeek()).filter(e => !guildEvents.map(t => t.name.toLowerCase()).includes(e.title.toLowerCase()));
    // console.log('g ' + guildEvents.map(t => t.name));

    for (let e of events) {
        var base64Img = '';
        var imgExt = '';
        if (e.logo) {
            var response = await fetch(e.logo, {
                method: 'GET',
                headers: {
                    'User-Agent': USER_AGENT
                }
            });
            base64Img = Buffer.from(await response.arrayBuffer()).toString('base64');
            imgExt = e.logo.split('.').pop();
            if (imgExt === 'jpg') 
                imgExt = 'jpeg';
        }

        let desc = e.description + '\n\n';
        desc += '- Orgnanizer: ' + e.organizers.map(o => o.name).join(', ') + '\n\n';
        desc += '- Format: ' + e.format + '\n\n';
        desc += '- Weight: ' + e.weight + '\n\n';

        var req_body;
        if (e.logo) {
            req_body = {
                    entity_metadata: {
                        location: (e.ctftime_url + ' @ ' + e.url).slice(0, 100 - 5)
                    },
                    name: e.title,
                    privacy_level: 2,
                    scheduled_start_time: e.start.slice(0, -6),
                    scheduled_end_time: e.finish.slice(0, -6),
                    description: desc.slice(0, 1000 - 5),
                    entity_type: 3,
                    image: `data:image/${imgExt};base64,${base64Img}`,
                };
        } else {
            req_body = {
                    entity_metadata: {
                        location: (e.ctftime_url + ' @ ' + e.url).slice(0, 100-5)
                    },
                    name: e.title,
                    privacy_level: 2,
                    scheduled_start_time: e.start.slice(0, -6),
                    scheduled_end_time: e.finish.slice(0, -6),
                    description: desc.slice(0, 1000-5),
                    entity_type: 3
                };
        }

        // console.log(JSON.stringify(req_body) + " " + (e.logo));
        // console.log(desc.length);

        checkRateLimit(10000);
        response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(req_body)
        });
        console.log(await response.text());
        
        // TODO: Better rate limit
        await new Promise(r => setTimeout(r, 2000));
        // break;
    }

    console.log("Add events ok!");
}

/**
 * 
 * @param {*} ctf_name 
 * @returns Channel object if CTF is ongoing, null otherwise
 */
export async function createChannel(guildId, ctf_name) {
    // console.log(guildEvents);
    var e = guildEvents.find(t => t.name.toLowerCase() === ctf_name.toLowerCase());
    if (!e) {
        return [null, null];
    }   
    
    var overwrites = PLAYER_ROLES_IDS.map(id => {
        return {
            id: id,
            type: 0,
            allow: '0',
            deny: '0'
        }
    });
    overwrites.push({
        id: EVERYONE_ROLE_ID,
        type: 0,
        allow: '0',
        deny: '1024'
    });

    // console.log(overwrites);

    checkRateLimit(2000);
    var response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
            name: ctf_name,
            type: ChannelTypes.GUILD_TEXT,
            parent_id: PARENT_CHANNEL,
            position: 2,
            // permission_overwrites: overwrites
        })
    });
    var channel = await response.json();
    // console.log('channel ' + JSON.stringify(channel));
    return [channel, e];
}

/* Discord API */
async function getGuildCTFEvents(guildId) {
    checkRateLimit();
    var response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, {
        method: 'GET',
        headers: AUTH_HEADERS
    });
    // console.log(await response.text());
    var events = await response.json();
    if (!events) 
        return [];
    // if (!Array.isArray(events))
    //     return [];
    // console.log(events);
    // console.log(BOT_USER_ID);
    return events.filter(e => e.entity_type === 3 && e.creator_id === BOT_USER_ID);
}