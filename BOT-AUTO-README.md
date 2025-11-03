# Bot Auto Chat - Hướng dẫn sử dụng

## Mô tả
Phiên bản cải tiến của bot cho phép cấu hình N số ví/bot và tự động chat với nhau trong cùng một kênh Discord.

## Tính năng chính

1. **Cấu hình nhiều bots**: Thêm bao nhiêu bots vào config cũng được
2. **Tự động chat với nhau**: Bots sẽ tự động reply và chat với nhau
3. **Phản hồi real-time**: Bots có thể phản hồi ngay khi nhận được tin nhắn từ bot khác
4. **Khởi tạo cuộc trò chuyện**: Bots có thể tự khởi tạo cuộc trò chuyện khi không có tin nhắn nào

## Cấu hình

Tạo file `config.json` với cấu trúc sau:

```json
{
    "users": [
        {
            "userToken": "TOKEN_BOT_1",
            "name": "Bot1"
        },
        {
            "userToken": "TOKEN_BOT_2",
            "name": "Bot2"
        },
        {
            "userToken": "TOKEN_BOT_3",
            "name": "Bot3"
        }
    ],
    "openaiApiKey": "YOUR_GROK_API_KEY",
    "guildId": "YOUR_GUILD_ID",
    "channelId": "YOUR_CHANNEL_ID",
    "delayMs": 60000
}
```

### Giải thích các tham số:

- **users**: Mảng các bot, mỗi bot cần:
  - `userToken`: Token Discord của bot đó
  - `name`: Tên hiển thị của bot (tùy chọn)
- **openaiApiKey**: API key của Grok/X.AI
- **guildId**: ID của server Discord
- **channelId**: ID của kênh chat
- **delayMs**: Thời gian chờ giữa các tin nhắn (milliseconds)

## Cách chạy

```bash
node bot-auto.js
```

## Cách hoạt động

1. **Khởi động**: Tất cả bots đăng nhập đồng thời
2. **Đăng ký**: Sau khi đăng nhập, hệ thống đăng ký ID của tất cả bots
3. **Chat loop**: Mỗi bot sẽ:
   - Lấy tin nhắn từ các bot khác (không phải từ chính nó)
   - Chọn ngẫu nhiên một tin nhắn để reply
   - Sử dụng AI để tạo phản hồi phù hợp với ngữ cảnh
   - Gửi reply hoặc tin nhắn mới
4. **Real-time response**: Bots cũng lắng nghe event `messageCreate` để phản hồi ngay khi có tin nhắn mới

## Lưu ý

- Cần ít nhất 2 bots để chúng có thể chat với nhau
- Bots sẽ chỉ chat với các bot khác, không reply tin nhắn từ users thường
- Mỗi bot có độ trễ ngẫu nhiên khi phản hồi để tránh spam đồng thời
- Bot có thể tự khởi tạo cuộc trò chuyện nếu không có tin nhắn nào trong một thời gian

## So sánh với bot.js

| Tính năng | bot.js | bot-auto.js |
|-----------|--------|-------------|
| Reply users | ✅ | ❌ |
| Chat với bots khác | ❌ | ✅ |
| Real-time response | ❌ | ✅ |
| Khởi tạo cuộc trò chuyện | ❌ | ✅ |
| Cấu hình nhiều bots | ✅ | ✅ |

