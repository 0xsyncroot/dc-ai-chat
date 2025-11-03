const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const GROK_MODEL = 'grok-4-fast-non-reasoning';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = config.grokApiKey;

const SYSTEM_PROMPT_CHAT = "you are a friendly, natural chatbot chatting with other bots. reply only in english, keep it short just a few words, don't capitalize the first letter. reply like you're chatting with a friend. maintain the conversation flow naturally. NEVER repeat or reuse messages that were already sent recently.";
const SYSTEM_PROMPT_INITIATE = "you are a friendly, natural chatbot. analyze the conversation context below and generate one short sentence (in english only) that relates to the topics being discussed. keep it casual, don't capitalize the first letter, just a few words like you're joining the conversation naturally about the same topic. NEVER repeat or reuse messages that were already sent recently.";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function cleanResponse(text) {
    if (!text) return text;
    return text.replace(/[.!]+$/, '').trim();
}

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

async function getRecentLLMMessagesFromChannel(channel, botIds) {
    try {
        const messagesCollection = await channel.messages.fetch({ limit: 100 });
        const llmMessages = Array.from(messagesCollection.values())
            .filter(msg => {
                return botIds.includes(msg.author.id) && 
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

class AutoBotInstance {
    constructor(userConfig, globalConfig, allBotIds, isFirstBot = false) {
        this.userToken = userConfig.userToken;
        this.userName = userConfig.name || 'Unknown';
        this.guildId = globalConfig.guildId;
        this.channelId = globalConfig.channelId;
        this.delayMs = globalConfig.delayMs || 60000;
        this.client = new Discord.Client();
        this.channel = null;
        this.chatCount = 0;
        this.allBotIds = allBotIds;
        this.lastMessageId = null;
        this.isFirstBot = isFirstBot;
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('ready', async () => {
            console.log(`[${this.userName}] Đã đăng nhập: ${this.client.user.tag}`);
            await this.startBot();
        });

        this.client.on('error', (error) => {
            console.error(`[${this.userName}] Lỗi client:`, error);
        });

        this.client.on('messageCreate', async (message) => {
            if (message.channelId === this.channelId && 
                message.author.id !== this.client.user.id &&
                this.allBotIds.includes(message.author.id)) {
                updateRecentLLMMessages(message.content);
                await this.handleIncomingMessage(message);
            }
        });
    }

    async startBot() {
        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) {
                console.error(`[${this.userName}] Không tìm thấy server!`);
                return;
            }
            
            this.channel = await guild.channels.fetch(this.channelId);
            if (!this.channel) {
                console.error(`[${this.userName}] Không tìm thấy kênh chat!`);
                return;
            }

            console.log(`[${this.userName}] Đã kết nối tới kênh: ${this.channel.name}`);
            
            await delay(this.delayMs);
            this.chatLoop();
        } catch (error) {
            console.error(`[${this.userName}] Lỗi khởi động bot:`, error);
        }
    }

    async syncRecentLLMMessages() {
        if (!this.channel || !this.isFirstBot || this.allBotIds.length === 0) {
            return;
        }
        try {
            const recentMessages = await getRecentLLMMessagesFromChannel(this.channel, this.allBotIds);
            recentLLMMessages.length = 0;
            recentLLMMessages.push(...recentMessages);
            console.log(`[${this.userName}] Đã đồng bộ ${recentLLMMessages.length} tin nhắn LLM gần nhất`);
        } catch (error) {
            console.error(`[${this.userName}] Lỗi khi đồng bộ tin nhắn LLM:`, error);
        }
    }

    async chatLoop() {
        while (true) {
            try {
                if (!this.channel) {
                    await delay(this.delayMs);
                    continue;
                }

                const messagesCollection = await this.channel.messages.fetch({ limit: 50 });
                const messages = Array.from(messagesCollection.values())
                    .filter(msg => {
                        return msg.author.id !== this.client.user.id && 
                               this.allBotIds.includes(msg.author.id) &&
                               msg.content.trim().length > 0;
                    })
                    .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

                if (messages.length === 0) {
                    if (this.isFirstBot) {
                        const shouldInitiate = Math.random() > 0.7;
                        if (shouldInitiate) {
                            await this.initiateConversation();
                        }
                    }
                    await delay(this.delayMs);
                    continue;
                }

                const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
                const recentMessages = messages.slice(0, 10);

                const conversationContext = recentMessages
                    .map(msg => `${msg.author.username}: ${msg.content}`)
                    .join('\n');

                const prompt = selectedMessage.content;
                
                const recentLLMContext = recentLLMMessages.length > 0 
                    ? `\n\nIMPORTANT: Do NOT repeat or reuse these recent messages that were already sent:\n${recentLLMMessages.slice(-20).join('\n')}\n\nGenerate a NEW and DIFFERENT response.`
                    : '';
                
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
                                content: `recent conversation:\n${conversationContext}${recentLLMContext}\n\nreply to: "${prompt}"`
                            }
                        ],
                        max_tokens: 60
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[${this.userName}] Grok API error: ${response.status} - ${errorText}`);
                    await delay(this.delayMs);
                    continue;
                }

                const completion = await response.json();
                let botResponse = completion.choices?.[0]?.message?.content?.trim();
                
                if (!botResponse) {
                    console.error(`[${this.userName}] Không nhận được phản hồi từ Grok!`);
                    await delay(this.delayMs);
                    continue;
                }

                botResponse = cleanResponse(botResponse);

                updateRecentLLMMessages(botResponse);

                try {
                    await selectedMessage.reply(botResponse);
                    this.chatCount++;
                    console.log(`[${this.userName}] Đã gửi tin nhắn #${this.chatCount} (trả lời ${selectedMessage.author.username}): ${botResponse}`);
                } catch (replyError) {
                    if (replyError.code === 50009 || (replyError.message && replyError.message.includes('verification level'))) {
                        try {
                            await this.channel.send(botResponse);
                            this.chatCount++;
                            console.log(`[${this.userName}] Đã gửi tin nhắn #${this.chatCount} (không thể reply): ${botResponse}`);
                        } catch (sendError) {
                            console.warn(`[${this.userName}] Không thể gửi tin nhắn: ${sendError.message}`);
                            recentLLMMessages.pop();
                        }
                    } else {
                        console.error(`[${this.userName}] Lỗi khi reply:`, replyError.message || replyError);
                        recentLLMMessages.pop();
                    }
                }
            } catch (error) {
                if (error.code !== 50009 && (!error.message || !error.message.includes('verification level'))) {
                    console.error(`[${this.userName}] Lỗi trong chat loop:`, error.message || error);
                }
            }

            await delay(this.delayMs);
        }
    }

    async initiateConversation() {
        try {
            if (!this.channel) return;

            const messagesCollection = await this.channel.messages.fetch({ limit: 50 });
            const allMessages = Array.from(messagesCollection.values())
                .filter(msg => msg.content.trim().length > 0)
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, 50);

            if (allMessages.length === 0) {
                return;
            }

            const conversationContext = allMessages
                .map(msg => `${msg.author.username}: ${msg.content}`)
                .join('\n');

            const recentLLMContext = recentLLMMessages.length > 0 
                ? `\n\nIMPORTANT: Do NOT repeat or reuse these recent messages that were already sent:\n${recentLLMMessages.slice(-20).join('\n')}\n\nGenerate a NEW and DIFFERENT response.`
                : '';

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
                            content: SYSTEM_PROMPT_INITIATE
                        },
                        { 
                            role: "user", 
                            content: `recent conversation (50 most recent messages):\n${conversationContext}${recentLLMContext}\n\nbased on this conversation, what would be a natural short response to join or continue discussing the topics mentioned?`
                        }
                    ],
                    max_tokens: 80
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[${this.userName}] Grok API error in initiateConversation: ${response.status} - ${errorText}`);
                return;
            }

            const completion = await response.json();
            let botResponse = completion.choices?.[0]?.message?.content?.trim();
            
            if (!botResponse) {
                console.error(`[${this.userName}] Không nhận được phản hồi từ Grok cho initiateConversation!`);
                return;
            }

            botResponse = cleanResponse(botResponse);

            updateRecentLLMMessages(botResponse);

            await this.channel.send(botResponse);
            this.chatCount++;
            console.log(`[${this.userName}] Đã khởi tạo cuộc trò chuyện #${this.chatCount} (dựa trên 50 tin gần nhất): ${botResponse}`);
        } catch (error) {
            console.error(`[${this.userName}] Lỗi khi khởi tạo cuộc trò chuyện:`, error.message || error);
        }
    }

    async handleIncomingMessage(message) {
        if (message.author.id === this.client.user.id) return;
        
        const shouldRespond = Math.random() > 0.3;
        if (!shouldRespond) return;

        await delay(Math.random() * 5000 + 2000);

        try {
            const messagesCollection = await this.channel.messages.fetch({ limit: 20 });
            const recentMessages = Array.from(messagesCollection.values())
                .filter(msg => msg.content.trim().length > 0)
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, 10);

            const conversationContext = recentMessages
                .map(msg => `${msg.author.username}: ${msg.content}`)
                .join('\n');

            const recentLLMContext = recentLLMMessages.length > 0 
                ? `\n\nIMPORTANT: Do NOT repeat or reuse these recent messages that were already sent:\n${recentLLMMessages.slice(-20).join('\n')}\n\nGenerate a NEW and DIFFERENT response.`
                : '';

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
                            content: `recent conversation:\n${conversationContext}${recentLLMContext}\n\nrespond naturally to the latest message.`
                        }
                    ],
                    max_tokens: 60
                })
            });

            if (!response.ok) return;

            const completion = await response.json();
            let botResponse = completion.choices?.[0]?.message?.content?.trim();
            
            if (!botResponse) return;

            botResponse = cleanResponse(botResponse);

            updateRecentLLMMessages(botResponse);

            try {
                await message.reply(botResponse);
                this.chatCount++;
                console.log(`[${this.userName}] Đã phản hồi ngay (trả lời ${message.author.username}): ${botResponse}`);
            } catch (replyError) {
                if (replyError.code === 50009) {
                    try {
                        await this.channel.send(botResponse);
                        this.chatCount++;
                        console.log(`[${this.userName}] Đã phản hồi ngay (không thể reply): ${botResponse}`);
                    } catch (sendError) {
                        console.warn(`[${this.userName}] Không thể gửi phản hồi: ${sendError.message}`);
                        recentLLMMessages.pop();
                    }
                } else {
                    recentLLMMessages.pop();
                }
            }
        } catch (error) {
            console.error(`[${this.userName}] Lỗi khi xử lý tin nhắn đến:`, error.message || error);
        }
    }

    login() {
        this.client.login(this.userToken).catch(error => {
            console.error(`[${this.userName}] Lỗi đăng nhập:`, error);
        });
    }
}

function startAutoBots() {
    const users = config.users || [];
    
    if (users.length === 0) {
        console.error("Không có người dùng nào được cấu hình! Vui lòng thêm users vào config.json");
        return;
    }

    if (users.length < 2) {
        console.warn("Cảnh báo: Cần ít nhất 2 bots để chúng có thể chat với nhau!");
    }

    console.log(`Đang khởi động ${users.length} bot instance(s) để tự động chat với nhau...`);
    
    const bots = [];
    const botIds = [];

    users.forEach((userConfig, index) => {
        const isFirstBot = index === 0;
        const bot = new AutoBotInstance(userConfig, config, botIds, isFirstBot);
        bots.push(bot);
    });

    bots.forEach(bot => {
        bot.login();
    });

    setTimeout(async () => {
        for (const bot of bots) {
            if (bot.client.user) {
                botIds.push(bot.client.user.id);
            }
        }
        
        for (const bot of bots) {
            bot.allBotIds = botIds;
            if (bot.isFirstBot) {
                await bot.syncRecentLLMMessages();
            }
        }
        
        console.log(`Đã đăng ký ${botIds.length} bot IDs để chat với nhau`);
    }, 5000);

    process.on('SIGINT', () => {
        console.log('\nĐang tắt tất cả bot instances...');
        bots.forEach(bot => {
            bot.client.destroy();
        });
        process.exit(0);
    });
}

startAutoBots();

