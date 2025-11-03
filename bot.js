// Import required libraries
const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');

// Read the configuration file (config.json)
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// Model configuration
const GROK_MODEL = 'grok-4-fast-non-reasoning';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = config.grokApiKey || config.openaiApiKey;

// System prompts
const SYSTEM_PROMPT_CHAT = "you are a friendly, natural chatbot. reply only in english, keep it short just a few words, don't capitalize the first letter. reply like you're chatting with a friend. NEVER repeat or reuse messages that were already sent recently.";
const SYSTEM_PROMPT_TOPIC = "you are a friendly, natural chatbot. analyze the conversation context below and generate one short sentence (in english only) that fits the general topic being discussed. keep it casual, don't capitalize the first letter, just a few words like you're joining the conversation naturally. NEVER repeat or reuse messages that were already sent recently.";

// Delay function (returns a Promise)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to remove trailing . and ! from AI response
function cleanResponse(text) {
    if (!text) return text;
    return text.replace(/[.!]+$/, '').trim();
}

// Store recent LLM messages (last 20)
const recentLLMMessages = [];

function updateRecentLLMMessages(messageContent) {
    const cleaned = cleanResponse(messageContent.toLowerCase());
    if (cleaned && cleaned.length > 0) {
        recentLLMMessages.push(cleaned);
        if (recentLLMMessages.length > 20) {
            recentLLMMessages.shift();
        }
    }
}

async function getRecentLLMMessagesFromChannel(channel, botUserId) {
    try {
        const messagesCollection = await channel.messages.fetch({ limit: 100 });
        const llmMessages = Array.from(messagesCollection.values())
            .filter(msg => {
                return msg.author.id === botUserId && 
                       msg.content.trim().length > 0;
            })
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
            .slice(0, 20)
            .map(msg => cleanResponse(msg.content.toLowerCase()));
        
        return llmMessages;
    } catch (error) {
        console.error('Error fetching recent LLM messages:', error);
        return [];
    }
}

// Bot class to manage each user instance
class BotInstance {
    constructor(userConfig, globalConfig) {
        this.userToken = userConfig.userToken;
        this.userName = userConfig.name || 'Unknown';
        this.guildId = globalConfig.guildId;
        this.channelId = globalConfig.channelId;
        this.delayMs = globalConfig.delayMs;
        this.client = new Discord.Client();
        this.channel = null;
        this.chatCount = 0;
        this.topicAnalysisInterval = null;
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('ready', async () => {
            console.log(`[${this.userName}] Logged in as: ${this.client.user.tag}`);
            await this.startBot();
        });

        this.client.on('error', (error) => {
            console.error(`[${this.userName}] Client error:`, error);
        });
    }

    async startBot() {
        try {
            // Start chat loop (runs indefinitely)
            this.chatLoop();
            // Start periodic topic analysis (runs in parallel)
            this.startPeriodicTopicAnalysis();
        } catch (error) {
            console.error(`[${this.userName}] Error starting bot:`, error);
        }
    }

    async syncRecentLLMMessages() {
        if (!this.channel || !this.client.user) {
            return;
        }
        try {
            const recentMessages = await getRecentLLMMessagesFromChannel(this.channel, this.client.user.id);
            recentLLMMessages.length = 0;
            recentLLMMessages.push(...recentMessages);
            console.log(`[${this.userName}] Synced ${recentLLMMessages.length} recent LLM messages`);
        } catch (error) {
            console.error(`[${this.userName}] Error syncing LLM messages:`, error);
        }
    }

    async chatLoop() {
        try {
            // Fetch the guild (server) using the ID from the configuration file
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) {
                console.error(`[${this.userName}] Guild (server) not found!`);
                return;
            }
            // Fetch the channel object from the guild
            this.channel = await guild.channels.fetch(this.channelId);
            if (!this.channel) {
                console.error(`[${this.userName}] Chat channel not found!`);
                return;
            }

            // Sync recent LLM messages on startup
            await this.syncRecentLLMMessages();

            while (true) {
                try {
                    // Fetch the most recent 100 messages from the channel
                    const messagesCollection = await this.channel.messages.fetch({ limit: 100 });
                    // Sort messages from oldest to newest
                    const messages = messagesCollection.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                    
                    // Filter out messages sent by the self-bot; keep only user messages
                    const userMessages = messages.filter(msg => msg.author.id !== this.client.user.id);
                    if (userMessages.size === 0) {
                        console.log(`[${this.userName}] No user messages found. Skipping this cycle.`);
                        await delay(this.delayMs);
                        continue;
                    }
                    
                    // Select one random user message
                    const randomIndex = Math.floor(Math.random() * userMessages.size);
                    const selectedMessage = Array.from(userMessages.values())[randomIndex];

                    // Build the prompt using the selected user message's content
                    const prompt = selectedMessage.content;
                    
                    const recentLLMContext = recentLLMMessages.length > 0 
                        ? `\n\nIMPORTANT: Do NOT repeat or reuse these recent messages that were already sent:\n${recentLLMMessages.slice(-20).join('\n')}\n\nGenerate a NEW and DIFFERENT response.`
                        : '';
                    
                    // Send the prompt to Grok API to generate a reply
                    const response = await fetch(GROK_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GROK_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: GROK_MODEL,
                            messages: [
                                { 
                                    role: "system", 
                                    content: SYSTEM_PROMPT_CHAT
                                },
                                { 
                                    role: "user", 
                                    content: `${prompt}${recentLLMContext}` 
                                }
                            ],
                            max_tokens: 50
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[${this.userName}] Grok API error: ${response.status} - ${errorText}`);
                        await delay(this.delayMs);
                        continue;
                    }

                    const completion = await response.json();
                    
                    // Retrieve the response content
                    let botResponse = completion.choices?.[0]?.message?.content?.trim();
                    if (!botResponse) {
                        console.error(`[${this.userName}] No response received from Grok!`);
                        await delay(this.delayMs);
                        continue;
                    }
                    // Remove trailing . and !
                    botResponse = cleanResponse(botResponse);
                    
                    // Update recent LLM messages before sending
                    updateRecentLLMMessages(botResponse);
                    
                    // Try to reply directly to the selected user message
                    try {
                        await selectedMessage.reply(botResponse);
                        // Increment the counter and log the result
                        this.chatCount++;
                        console.log(`[${this.userName}] Sent message #${this.chatCount} in reply to ${selectedMessage.author.username}: ${botResponse}`);
                    } catch (replyError) {
                        // Handle verification level errors gracefully
                        if (replyError.code === 50009 || (replyError.message && replyError.message.includes('verification level'))) {
                            console.warn(`[${this.userName}] Cannot reply: Channel verification level is too high. Skipping this message.`);
                            recentLLMMessages.pop();
                        } else {
                            console.error(`[${this.userName}] Error replying to message:`, replyError.message || replyError);
                            recentLLMMessages.pop();
                        }
                        // Error handled, continue to next iteration
                    }
                } catch (error) {
                    // Only log non-verification errors (verification errors are already handled above)
                    if (error.code !== 50009 && (!error.message || !error.message.includes('verification level'))) {
                        console.error(`[${this.userName}] An error occurred in the chat loop:`, error.message || error);
                    }
                }

                // Delay for the configured time before repeating
                await delay(this.delayMs);
            }
        } catch (error) {
            console.error(`[${this.userName}] An error occurred while fetching guild or channel:`, error);
        }
    }

    async analyzeTopicAndChat() {
        if (!this.channel) {
            return;
        }

        try {
            // Fetch messages in batches (Discord API limit is 100 per request)
            const allMessages = [];
            let lastMessageId = null;
            const targetCount = 200;
            
            while (allMessages.length < targetCount) {
                const fetchOptions = { limit: 100 };
                if (lastMessageId) {
                    fetchOptions.before = lastMessageId;
                }
                
                const batch = await this.channel.messages.fetch(fetchOptions);
                if (batch.size === 0) break;
                
                const batchArray = Array.from(batch.values());
                allMessages.push(...batchArray);
                
                // Get the oldest message ID for next batch
                lastMessageId = batchArray[batchArray.length - 1].id;
                
                // If we got less than 100, we've reached the end
                if (batch.size < 100) break;
            }
            
            const messages = allMessages
                .filter(msg => msg.author.id !== this.client.user.id && msg.content.trim().length > 0)
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, targetCount);

            if (messages.length === 0) {
                console.log(`[${this.userName}] No messages found for topic analysis.`);
                return;
            }

            // Build conversation context from recent messages
            const conversationContext = messages
                .map(msg => `${msg.author.username}: ${msg.content}`)
                .join('\n');

            const recentLLMContext = recentLLMMessages.length > 0 
                ? `\n\nIMPORTANT: Do NOT repeat or reuse these recent messages that were already sent:\n${recentLLMMessages.slice(-20).join('\n')}\n\nGenerate a NEW and DIFFERENT response.`
                : '';

            // Send to Grok API to analyze topic and generate contextual response
            const response = await fetch(GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: GROK_MODEL,
                    messages: [
                        { 
                            role: "system", 
                            content: SYSTEM_PROMPT_TOPIC
                        },
                        { 
                            role: "user", 
                            content: `recent conversation:\n${conversationContext}${recentLLMContext}\n\nbased on this conversation, what would be a natural short response to join the topic?` 
                        }
                    ],
                    max_tokens: 80
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[${this.userName}] Grok API error in topic analysis: ${response.status} - ${errorText}`);
                return;
            }

            const completion = await response.json();
            let topicResponse = completion.choices?.[0]?.message?.content?.trim();
            
            if (!topicResponse) {
                console.error(`[${this.userName}] No response received from Grok for topic analysis!`);
                return;
            }

            // Remove trailing . and !
            topicResponse = cleanResponse(topicResponse);

            // Update recent LLM messages before sending
            updateRecentLLMMessages(topicResponse);

            // Try to send the message directly to the channel (not as a reply)
            try {
                await this.channel.send(topicResponse);
                this.chatCount++;
                console.log(`[${this.userName}] Sent topic-based message #${this.chatCount}: ${topicResponse}`);
            } catch (sendError) {
                // Handle verification level errors gracefully
                if (sendError.code === 50009) {
                    console.warn(`[${this.userName}] Cannot send topic message: Channel verification level is too high. Skipping.`);
                    recentLLMMessages.pop();
                } else {
                    console.error(`[${this.userName}] Error sending topic message:`, sendError.message);
                    recentLLMMessages.pop();
                }
            }
        } catch (error) {
            console.error(`[${this.userName}] An error occurred in topic analysis:`, error.message || error);
        }
    }

    startPeriodicTopicAnalysis() {
        const intervalMs = 2 * 60 * 1000; // 2 minutes
        this.topicAnalysisInterval = setInterval(() => {
            this.analyzeTopicAndChat();
        }, intervalMs);
        console.log(`[${this.userName}] Started periodic topic analysis (every 2 minutes)`);
    }

    login() {
        this.client.login(this.userToken).catch(error => {
            console.error(`[${this.userName}] Login error:`, error);
        });
    }
}

// Main function to start all bot instances
function startBots() {
    const users = config.users || [];
    
    if (users.length === 0) {
        console.error("No users configured! Please add users to config.json");
        return;
    }

    console.log(`Starting ${users.length} bot instance(s)...`);
    
    // Create and start all bot instances in parallel
    const bots = users.map((userConfig, index) => {
        const bot = new BotInstance(userConfig, config);
        bot.login();
        return bot;
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down all bot instances...');
        bots.forEach(bot => {
            if (bot.topicAnalysisInterval) {
                clearInterval(bot.topicAnalysisInterval);
            }
            bot.client.destroy();
        });
        process.exit(0);
    });
}

// Start all bots
startBots();
