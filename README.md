# Discord Self-Bot Chat với Grok/X.AI

Dự án này là một self-bot cho Discord sử dụng API Grok/X.AI để tạo phản hồi chat. Bot có thể trả lời tin nhắn của người dùng và cũng có thể tự động chat với các bot khác. Bao gồm các tính năng để tránh tin nhắn trùng lặp và duy trì ngữ cảnh cuộc trò chuyện.

**CẢNH BÁO:** Sử dụng self-bot (tự động hóa tài khoản người dùng thông thường) trên Discord vi phạm [Điều khoản Dịch vụ của Discord](https://discord.com/terms) và có thể dẫn đến việc tài khoản của bạn bị cấm. Sử dụng mã này với rủi ro của riêng bạn.

## Tính năng

- Trả lời tin nhắn của người dùng trong kênh Discord bằng AI (Grok/X.AI)
- Phân tích chủ đề định kỳ và phản hồi theo ngữ cảnh
- Hỗ trợ nhiều bot instances (chat với nhau)
- Ngăn chặn tin nhắn trùng lặp bằng cách theo dõi 20 tin nhắn LLM gần nhất
- Có thể cấu hình độ trễ giữa các tin nhắn
- Nhiều bot instances có thể tự động chat với nhau
- System prompts được lưu dưới dạng constants để dễ cấu hình

## Yêu cầu

- **Node.js** (phiên bản 20.x LTS trở lên được khuyến nghị)
- **npm** (đi kèm với Node.js)
- Tài khoản Discord cá nhân (lưu ý rằng việc sử dụng self-bot có rủi ro khiến tài khoản của bạn bị cấm)
- **UserToken** cho tài khoản Discord của bạn
- **Grok/X.AI API key** (lấy từ console.x.ai)

## Cài đặt

### Bước 1: Cài đặt Node.js

#### Windows

1. **Tải xuống Node.js:**
   - Truy cập trang web chính thức của Node.js: [https://nodejs.org/](https://nodejs.org/)
   - Tải xuống phiên bản **LTS** (được khuyến nghị để ổn định)
   - Chọn trình cài đặt phù hợp với hệ thống của bạn (64-bit hoặc 32-bit)

2. **Chạy trình cài đặt:**
   - Mở file `.msi` vừa tải xuống
   - Làm theo hướng dẫn của trình cài đặt:
     - Chấp nhận thỏa thuận giấy phép
     - Chọn vị trí cài đặt (mặc định được khuyến nghị)
     - Đảm bảo tùy chọn "Add to PATH" được chọn
     - Nhấp "Install"

3. **Xác minh cài đặt:**
   - Mở Command Prompt (CMD) hoặc PowerShell
   - Chạy các lệnh sau:
     ```bash
     node -v
     npm -v
     ```
   - Cả hai lệnh sẽ hiển thị số phiên bản (ví dụ: `v20.11.0` và `10.2.4`)

#### macOS

1. **Tùy chọn 1: Sử dụng Homebrew (Khuyến nghị)**
   ```bash
   # Cài đặt Homebrew nếu bạn chưa có
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Cài đặt Node.js
   brew install node
   ```

2. **Tùy chọn 2: Sử dụng Trình cài đặt Chính thức**
   - Truy cập [https://nodejs.org/](https://nodejs.org/)
   - Tải xuống trình cài đặt macOS (file `.pkg`)
   - Mở file vừa tải xuống và làm theo hướng dẫn của trình cài đặt

3. **Xác minh cài đặt:**
   - Mở Terminal
   - Chạy:
     ```bash
     node -v
     npm -v
     ```

#### Linux (Ubuntu/Debian)

```bash
# Cập nhật danh sách gói
sudo apt update

# Cài đặt Node.js và npm
sudo apt install nodejs npm

# Xác minh cài đặt
node -v
npm -v
```

**Lưu ý:** Để quản lý nhiều phiên bản Node.js, hãy cân nhắc sử dụng [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm).

### Bước 2: Clone Repository

```bash
git clone <REPOSITORY_URL>
cd dc-ai-chat
```

### Bước 3: Cài đặt Dependencies

```bash
npm install
```

Lệnh này sẽ cài đặt các gói cần thiết:
- `discord.js-selfbot-v13` - Thư viện Discord self-bot

## Cấu hình

Tạo file `config.json` trong thư mục gốc với cấu trúc sau:

### Cấu hình Bot đơn

```json
{
  "users": [
    {
      "userToken": "YOUR_DISCORD_USER_TOKEN",
      "name": "Bot1"
    }
  ],
  "openaiApiKey": "YOUR_GROK_API_KEY",
  "guildId": "YOUR_GUILD_ID",
  "channelId": "YOUR_CHANNEL_ID",
  "delayMs": 60000
}
```

### Cấu hình Nhiều Bot

```json
{
  "users": [
    {
      "userToken": "YOUR_FIRST_BOT_TOKEN",
      "name": "Bot1"
    },
    {
      "userToken": "YOUR_SECOND_BOT_TOKEN",
      "name": "Bot2"
    },
    {
      "userToken": "YOUR_THIRD_BOT_TOKEN",
      "name": "Bot3"
    }
  ],
  "openaiApiKey": "YOUR_GROK_API_KEY",
  "guildId": "YOUR_GUILD_ID",
  "channelId": "YOUR_CHANNEL_ID",
  "delayMs": 60000
}
```

### Tham số Cấu hình

- **users**: Mảng các cấu hình bot
  - **userToken**: Discord user token của bạn (xem cách lấy bên dưới)
  - **name**: Tên hiển thị cho bot (tùy chọn)
- **openaiApiKey**: Grok/X.AI API key của bạn (xem cách lấy ở phần "Cách lấy Grok/X.AI API Key")
- **guildId**: ID của Discord server (guild)
- **channelId**: ID của kênh Discord nơi bot sẽ hoạt động
- **delayMs**: Độ trễ giữa các tin nhắn tính bằng milliseconds (mặc định: 60000 = 1 phút)

### Cách lấy Discord User Token

**⚠️ CẢNH BÁO: Điều này vi phạm Điều khoản Dịch vụ của Discord**

1. Mở Discord trong trình duyệt web của bạn
2. Nhấn `F12` để mở Developer Tools
3. Chuyển đến tab "Console"
4. Chạy lệnh này:
   ```javascript
   window.localStorage.getItem('token')
   ```
5. Sao chép token (sẽ được hiển thị trong dấu ngoặc kép)

**Giữ token của bạn an toàn và không bao giờ chia sẻ công khai!**

### Cách lấy Discord Server và Channel ID

1. Bật Developer Mode trong Discord:
   - Đi tới User Settings → Advanced → Enable Developer Mode
2. Nhấp chuột phải vào tên server của bạn → "Copy Server ID"
3. Nhấp chuột phải vào kênh → "Copy Channel ID"

Hoặc từ URL:
- Định dạng URL: `https://discord.com/channels/GUILD_ID/CHANNEL_ID`
- Trích xuất ID từ URL

### Cách lấy Grok/X.AI API Key và Nạp tiền

#### Bước 1: Đăng ký/Ghi danh vào console.x.ai

1. Truy cập trang web console của X.AI: [https://console.x.ai/](https://console.x.ai/)
2. Đăng nhập bằng tài khoản X (Twitter) của bạn
   - Nếu chưa có tài khoản, bạn cần tạo tài khoản X (Twitter) trước
3. Xác minh email và hoàn tất quá trình đăng ký nếu được yêu cầu

#### Bước 2: Lấy API Key

1. Sau khi đăng nhập vào console.x.ai, điều hướng đến phần **API Keys** hoặc **Settings**
2. Tạo API key mới:
   - Nhấp vào nút "Create API Key" hoặc "Generate New Key"
   - Nhập tên mô tả cho API key (ví dụ: "Discord Bot")
   - Nhấp "Create" hoặc "Generate"
3. Sao chép API key ngay lập tức:
   - API key sẽ chỉ hiển thị một lần
   - Lưu nó vào nơi an toàn (ví dụ: password manager)
   - Format API key thường là: `xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Lưu ý:** 
- API key của bạn có quyền truy cập vào tài khoản và tài chính của bạn
- Không bao giờ chia sẻ API key công khai hoặc commit vào git
- Nếu API key bị lộ, hãy xóa nó ngay và tạo key mới

#### Bước 3: Nạp tiền vào tài khoản

1. Trong console.x.ai, điều hướng đến phần **Billing** hoặc **Credits**
2. Nhấp vào nút "Add Credits" hoặc "Top Up"
3. Chọn phương thức thanh toán:
   - Thẻ tín dụng/thẻ ghi nợ
   - PayPal (nếu có)
4. Nhập số tiền muốn nạp:
   - Grok API tính phí theo usage (số lượng tokens sử dụng)
   - Kiểm tra bảng giá trên trang để biết chi phí
   - Khuyến nghị nạp tối thiểu $10-20 để đảm bảo bot hoạt động ổn định
5. Hoàn tất giao dịch:
   - Xác nhận thông tin thanh toán
   - Kiểm tra email xác nhận
   - Credits sẽ được cập nhật vào tài khoản sau vài phút

#### Bước 4: Kiểm tra Credits và Usage

1. Trong console.x.ai, vào phần **Dashboard** hoặc **Usage**
2. Xem số credits còn lại
3. Theo dõi usage để biết bot đang sử dụng bao nhiêu
4. Thiết lập alerts để được thông báo khi credits sắp hết (nếu có tính năng này)

**Lưu ý về chi phí:**
- Grok API tính phí theo số tokens sử dụng (input + output)
- Mỗi tin nhắn bot gửi sẽ tốn một lượng tokens nhất định
- Với `delayMs: 60000` (1 phút), bot sẽ gửi khoảng 60 tin nhắn/giờ
- Chi phí phụ thuộc vào độ dài của prompt và response
- Ước tính: khoảng $1-5/tháng cho một bot chạy 24/7 (tùy vào tần suất và độ dài tin nhắn)

#### Cấu hình API Key trong config.json

Sau khi có API key từ console.x.ai, thêm nó vào file `config.json`:

**Cách 1: Sử dụng `openaiApiKey` (đơn giản nhất)**

```json
{
  "users": [...],
  "openaiApiKey": "xai-your-api-key-here",
  "guildId": "...",
  "channelId": "...",
  "delayMs": 60000
}
```

**Cách 2: Sử dụng `grokApiKey` (ưu tiên)**

```json
{
  "users": [...],
  "grokApiKey": "xai-your-api-key-here",
  "openaiApiKey": "xai-your-api-key-here",
  "guildId": "...",
  "channelId": "...",
  "delayMs": 60000
}
```

**Lưu ý về cấu hình API key:**
- Bot sẽ ưu tiên sử dụng `grokApiKey` nếu có, nếu không sẽ dùng `openaiApiKey`
- **Cả hai đều phải là Grok API key từ console.x.ai** (không phải OpenAI API key)
- Tên biến `openaiApiKey` được giữ lại để tương thích với code cũ, nhưng thực tế chỉ dùng Grok API
- Format API key từ X.AI: `xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Bot Tiêu chuẩn (bot.js)

Trả lời tin nhắn của người dùng:

```bash
node bot.js
```

**Tính năng:**
- Trả lời tin nhắn ngẫu nhiên của người dùng
- Phân tích chủ đề định kỳ mỗi 2 phút
- Ngăn chặn tin nhắn trùng lặp (theo dõi 20 tin nhắn LLM gần nhất)

### Bot Tự động Chat (bot-auto.js)

Nhiều bot tự động chat với nhau:

```bash
node bot-auto.js
```

**Tính năng:**
- Bots tự động chat với nhau
- Bot đầu tiên khởi tạo cuộc trò chuyện dựa trên 50 tin nhắn gần nhất
- Các bot khác trả lời tin nhắn từ các bot khác
- Xử lý tin nhắn real-time
- Ngăn chặn tin nhắn trùng lặp (theo dõi 20 tin nhắn LLM gần nhất)

## Cách hoạt động

1. **Khởi tạo:**
   - Bot đăng nhập vào Discord bằng user token
   - Kết nối với kênh được chỉ định
   - Đồng bộ 20 tin nhắn LLM gần nhất để tránh trùng lặp

2. **Tạo tin nhắn:**
   - Bot lấy tin nhắn gần đây từ kênh
   - Chọn một tin nhắn để trả lời (chọn ngẫu nhiên)
   - Gửi prompt đến Grok/X.AI API với:
     - System prompt (được cấu hình dưới dạng constant)
     - Ngữ cảnh cuộc trò chuyện gần đây
     - Danh sách 20 tin nhắn LLM gần nhất (để tránh trùng lặp)

3. **Xử lý Phản hồi:**
   - Bot nhận phản hồi từ AI
   - Làm sạch phản hồi (xóa dấu câu ở cuối)
   - Gửi reply đến Discord
   - Cập nhật danh sách tin nhắn gần đây

4. **Phân tích Chủ đề** (chỉ bot.js):
   - Mỗi 2 phút, phân tích chủ đề cuộc trò chuyện
   - Tạo tin nhắn theo ngữ cảnh dựa trên cuộc thảo luận
   - Gửi tin nhắn trực tiếp vào kênh

## Tùy chỉnh

### System Prompts

Bạn có thể tùy chỉnh hành vi của AI bằng cách chỉnh sửa system prompts ở đầu các file:

**bot.js:**
- `SYSTEM_PROMPT_CHAT`: Cho các reply chat thông thường
- `SYSTEM_PROMPT_TOPIC`: Cho phân tích chủ đề

**bot-auto.js:**
- `SYSTEM_PROMPT_CHAT`: Cho bot-to-bot chat
- `SYSTEM_PROMPT_INITIATE`: Cho khởi tạo cuộc trò chuyện

### Độ trễ Tin nhắn

Điều chỉnh `delayMs` trong `config.json` để kiểm soát tần suất bot gửi tin nhắn:
- Giá trị thấp hơn = tin nhắn thường xuyên hơn (rủi ro rate limiting cao hơn)
- Giá trị cao hơn = tin nhắn ít thường xuyên hơn (an toàn hơn)

## Khắc phục Sự cố

### Bot không phản hồi

- Kiểm tra xem Discord token của bạn có hợp lệ không
- Xác minh guild và channel ID có đúng không
- Kiểm tra API key có hợp lệ và có credits không
- Xem lại console logs để tìm thông báo lỗi

### Rate Limiting

- Tăng `delayMs` trong config.json
- Discord có thể rate limit nếu bạn gửi quá nhiều tin nhắn quá nhanh

### Lỗi Verification Level

- Một số Discord server có mức verification cao
- Bot có thể bỏ qua tin nhắn nếu yêu cầu verification
- Kiểm tra console logs để tìm lỗi verification

## Lưu ý Quan trọng

- **CẢNH BÁO:** Sử dụng self-bot vi phạm Điều khoản Dịch vụ của Discord và có thể dẫn đến việc tài khoản của bạn bị khóa hoặc cấm. Sử dụng mã này với rủi ro của riêng bạn.
- Giữ **userToken** và **API keys** của bạn an toàn và không bao giờ chia sẻ công khai
- Bot theo dõi 20 tin nhắn LLM gần nhất để tránh trùng lặp - điều này được xử lý tự động
- Để sử dụng trong production, hãy cân nhắc thêm cải thiện xử lý lỗi và logging

## Giấy phép

Dự án này được cung cấp "như vậy" mà không có bất kỳ bảo đảm nào. Hãy tự do chỉnh sửa và sử dụng theo nhu cầu của bạn.

## Hỗ trợ

Đối với các vấn đề hoặc câu hỏi:
1. Kiểm tra console logs để tìm thông báo lỗi
2. Xác minh cấu hình của bạn là đúng
3. Đảm bảo phiên bản Node.js tương thích (20.x LTS trở lên)
