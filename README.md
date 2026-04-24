# CoinHub - Nền Tảng Trải Nghiệm Trading Tiền Điện Tử

## Thành Viên Nhóm

| STT | Họ Tên | MSSV | Nhiệm vụ |
|-----|--------|------|---------|
| 1 | Nguyễn Phan Hoàng Long | 24521006 | Code |
| 2 | Claude.ai | | Dựng project tree theo yêu cầu |

## Mô Tả Ngắn

CoinHub là nền tảng giao dịch giả định tiền điện tử cho phép người dùng thực hành giao dịch mà không bị rủi ro tài chính. Ứng dụng tích hợp dữ liệu realtime từ Binance, cung cấp sổ lệnh và lịch sử giao dịch chi tiết. Người dùng có thể thiết lập watchlist, nhận cảnh báo giá qua email, và theo dõi hiệu suất với bảng điều khiển quản trị.

## Tính Năng Chính

- **Xác thực người dùng**: Đăng ký, OTP, đăng nhập, quên mật khẩu, reset mật khẩu
- **Giao dịch**: Mua/bán market, đặt lệnh limit, xem sổ lệnh realtime
- **Giá Realtime**: Kết nối Binance WebSocket, cập nhật 10 coin hàng đầu
- **Watchlist**: Theo dõi coin yêu thích, cảnh báo giá qua email
- **Lịch Sử Giao Dịch**: Xem chi tiết tất cả giao dịch, số dư, lệnh chờ
- **Tin Tức**: Lấy tin tức tiền điện tử từ CoinGecko
- **Dashboard Admin**: Thống kê latency (p50/p95/p99)

## Tech Stack

| Thành Phần | Công Nghệ |
|-----------|-----------|
| **Backend** | Node.js 20, Express, Socket.IO, pg, ioredis, bcryptjs, jwt |
| **Frontend** | React 18, Vite, TailwindCSS, Chart.js, Socket.IO Client |
| **Database** | PostgreSQL 16 (Docker), Redis 7 (Docker) |
| **Email** | Nodemailer (Mailpit dev, Gmail SMTP prod) |
| **Proxy** | Nginx |
| **Container** | Docker + Docker Compose |

## Cài Đặt Và Chạy

```bash
# Clone repo
git clone <repository-url> && cd coinhub

# Copy .env.example
cp .env.example .env

# Build và chạy services
docker-compose up -d

# Seed dữ liệu 
docker exec -it coinhub-backend node seed.js

# Truy cập
# Ứng dụng: http://localhost
# Mailpit: http://localhost:8025
# Postgres: localhost:5432
# Redis: localhost:6379
```

## Cấu Trúc Thư Mục

```
cryptotrack/
├── backend/
│   ├── db/
│   │   ├── index.js                    # Khởi tạo pg Pool, export hàm query(sql, params) dùng chung toàn backend
│   │   └── init.sql                    # Tạo toàn bộ bảng và index, tự chạy khi Docker boot lần đầu
│   ├── middleware/
│   │   ├── auth.js                     # Đọc JWT từ httpOnly cookie, verify token, gắn req.user, trả 401 nếu lỗi
│   │   ├── admin.js                    # Kiểm tra req.user.role === 'admin', trả 403 nếu không phải admin
│   │   └── error.js                    # Global error handler Express, bắt mọi lỗi, trả JSON thống nhất
│   ├── routes/
│   │   ├── auth.js                     # Các route đăng ký, OTP, đăng nhập, logout, quên mật khẩu, reset, lấy session
│   │   ├── coins.js                    # Các route lấy danh sách coin, chi tiết, lịch sử giá 24h, tin tức
│   │   ├── trade.js                    # Các route mua/bán market, limit order, lịch sử giao dịch, số dư, pending
│   │   ├── watchlist.js                # Các route xem, thêm, xóa coin theo dõi và đặt ngưỡng giá cảnh báo
│   │   └── admin.js                    # Các route thống kê hệ thống và dữ liệu latency dành riêng cho admin
│   ├── services/
│   │   ├── auth.js                     # Các hàm hash/compare password, ký/verify JWT, tạo và xác minh OTP qua Redis
│   │   ├── email.js                    # Khởi tạo Nodemailer, gửi email OTP đăng ký, reset mật khẩu, cảnh báo giá
│   │   ├── binance.js                  # Kết nối Binance WebSocket, subscribe bookTicker và trade 10 coin, tự reconnect
│   │   ├── coingecko.js                # Gọi CoinGecko REST API lấy metadata coin, lịch sử 24h, tin tức, cache Redis
│   │   ├── trade.js                    # Xử lý mua/bán market và limit order, tính phí, slippage, ghi DB, notify client
│   │   ├── alert.js                    # Kiểm tra watchlist vs giá bid/ask, gửi email cảnh báo, cooldown 1 giờ Redis
│   │   ├── broadcast.js                # Gắn serverTime vào payload, broadcast giá qua Socket.IO, lưu Redis và DB
│   │   └── latency.js                  # Nhận latency report từ client, lưu Redis ring buffer, tính p50/p95/p99 mỗi 5s
│   ├── app.js                          # Tạo Express app, gắn middleware cors/cookie-parser/helmet/json, mount routes
│   ├── server.js                       # Tạo HTTP server, attach Socket.IO, khởi động Binance WS, lắng nghe port
│   ├── socket.js                       # Export Socket.IO instance singleton, tránh circular import giữa các service
│   ├── seed.js                         # Gọi CoinGecko lấy top 10 coin, upsert vào bảng coins, chạy thủ công
│   ├── load_test.js                    # Script k6: 100 virtual users WebSocket, đo latency, assert 95% dưới 1000ms
│   ├── package.json                    # Dependencies và scripts npm
│   └── Dockerfile                      # Build image backend Node.js 20
├── frontend/
│   ├── public/
│   │   └── favicon.svg                 # Icon logo CoinHub dạng SVG
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Lưu user state, hàm login/logout, khôi phục session từ cookie khi mount
│   │   │   └── SocketContext.jsx       # Tạo một Socket.IO connection duy nhất cho toàn app, disconnect khi logout
│   │   ├── hooks/
│   │   │   ├── useAuth.js              # Consume AuthContext, expose user/isAdmin/login/logout
│   │   │   ├── usePrices.js            # Lắng nghe WS event price, trả Map<symbol, {ask,bid,change24h,volume}>
│   │   │   ├── useOrderBook.js         # Nhận symbol, lắng nghe WS orderbook:{symbol}, trả {bids, asks}
│   │   │   ├── useLatency.js           # Đo latency mỗi WS message, emit latency_report lên server, trả stats
│   │   │   └── useWatchlist.js         # Fetch watchlist khi mount, expose watchlist/addCoin/removeCoin
│   │   ├── pages/
│   │   │   ├── Home.jsx                # Trang chủ full viewport không scroll: Navbar, TickerBar, hero chart, 3 cột
│   │   │   ├── Trade.jsx               # Trang giao dịch 2 cột: danh sách coin trái, chi tiết phải, nút mua/bán nổi
│   │   │   ├── History.jsx             # Lịch sử giao dịch: bảng filter realtime, phân trang, 4 KPI card
│   │   │   ├── News.jsx                # Tin tức CoinGecko: danh sách dọc, phân trang 5 bài/trang, 5 trang
│   │   │   ├── Admin.jsx               # Trang admin: KPI latency, biểu đồ p50/p95/p99, bảng thống kê WS
│   │   │   ├── Login.jsx               # Trang đăng nhập: form email + password, link đến đăng ký và quên mật khẩu
│   │   │   ├── Register.jsx            # Trang đăng ký: form name/email/password, submit gửi OTP về email
│   │   │   ├── OTP.jsx                 # Trang nhập OTP: 6 ô input, dùng OTPInput component, submit verify
│   │   │   ├── ForgotPassword.jsx      # Trang quên mật khẩu bước 1: nhập email, gửi OTP reset
│   │   │   └── ResetPassword.jsx       # Trang đặt mật khẩu mới bước 3: nhập password mới sau khi OTP xác minh
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Logo, nav links, wallet chip đổi đơn vị, user chip, hiện admin link nếu đủ quyền
│   │   │   ├── TickerBar.jsx           # Dải giá chạy ngang bên dưới Navbar, cập nhật realtime từ usePrices
│   │   │   ├── AllCoinChart.jsx        # Chart.js multi-line 24h, mỗi coin một màu, nền trong suốt, tooltip hover
│   │   │   ├── OrderBook.jsx           # Bảng sổ lệnh 3 cột bid/giá/ask, thanh màu nền, cập nhật realtime WS
│   │   │   ├── RecentTrades.jsx        # Bảng giao dịch gần đây thời gian/giá xanh-đỏ/khối lượng, cập nhật WS
│   │   │   ├── WatchModal.jsx          # Modal dùng chung cho mua/bán và theo dõi giá, phân biệt qua props mode
│   │   │   ├── OTPInput.jsx            # 6 ô input OTP riêng biệt, auto focus ô tiếp theo, hỗ trợ paste
│   │   │   ├── LatencyChart.jsx        # Chart.js đường p50/p95/p99 theo thời gian, đường SLA 1000ms nét đứt
│   │   │   └── ProtectedRoute.jsx      # Wrapper React Router, redirect login nếu chưa auth, redirect home nếu không phải admin
│   │   ├── utils/
│   │   │   ├── api.js                  # Wrapper fetch tự gắn credentials:include và Content-Type, export get/post/del
│   │   │   ├── formatters.js           # Các hàm format giá, phần trăm, khối lượng, thời gian, ngày tháng
│   │   │   └── constants.js            # COIN_LIST, CHART_COLORS, SLA_THRESHOLD, FEE_RATE, SLIPPAGE_RATE
│   │   ├── App.jsx                     # Khai báo tất cả routes React Router v6, bọc protected routes
│   │   └── main.jsx                    # Mount App vào DOM, bọc AuthProvider rồi SocketProvider
│   ├── index.html                      # HTML entry point
│   ├── vite.config.js                  # Config Vite, proxy /api và /socket.io về backend:3000
│   ├── tailwind.config.js              # Config TailwindCSS, dark theme màu teal/jade ngọc bích
│   ├── package.json                    # Dependencies React, Vite, TailwindCSS, Chart.js
│   └── Dockerfile                      # Multi-stage: build với Node.js, serve với Nginx
├── nginx/
│   ├── nginx.conf                      # Proxy /api và /socket.io về backend, / về frontend, WebSocket headers
│   └── Dockerfile                      # Copy nginx.conf vào /etc/nginx/conf.d/default.conf
├── docker-compose.yml                  # Development: Postgres, Redis, Mailpit, Backend, Frontend, Nginx
├── docker-compose.prod.yml             # Production: VITE_API_URL, SSL certs (TODO)
├── .env.example                        # Mẫu biến môi trường
├── .gitignore                          # Node modules, .env, build artifacts
└── README.md                           # Tài liệu này
```

## Luồng Hoạt Động

### 1. Xác Thực Người Dùng

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /api/auth/register
       │ {name, email, password}
       ▼
┌─────────────────────┐
│  Backend (auth.js)  │
│  • Hash password    │
│  • Generate OTP     │
│  • Save user + OTP  │ ◄──── Nodemailer
└────────┬────────────┘
         │
         │ Email OTP
         ▼
┌──────────────────┐
│ User Inbox       │
│ (Mailpit / SMTP) │
└──────────────────┘
```

### 2. Giao Dịch Realtime

```
┌──────────────┐                    ┌─────────────────┐
│ Binance WS   │◄───────────────────┤  Backend        │
│ bookTicker   │  subscribe 10 coin │  (binance.js)   │
└──────┬───────┘                    └────────┬────────┘
       │                                     │
       │ bid/ask prices                      │ broadcast
       └────────────────┬────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │    Socket.IO Event: price     │
        │ {symbol, bid, ask, time, ...} │
        └───────────────────┬───────────┘
                            │
                            ▼
              ┌──────────────────────┐
              │  Frontend (usePrices) │
              │  Update Chart, UI     │
              └──────────────────────┘
```

### 3. Cảnh Báo Giá

```
┌──────────────────────┐
│  Watchlist (alert.js) │ ◄──── Compare bid/ask vs thresholds
│  • Check every 30s    │
│  • Cooldown 1h Redis  │
└──────────────┬───────┘
               │
        ┌──────▼─────────┐
        │ Price matched? │
        └──┬───────┬─────┘
          YES      NO
           │
           ▼
    ┌─────────────────────┐
    │ Nodemailer          │
    │ Send email alert    │
    │ (CoinGecko metadata)│
    └─────────────────────┘
```

## Xử Lý Sự Cố

### 1. PostgreSQL Connection Error

```bash
# Kiểm tra Postgres container
docker-compose logs postgres

# Restart Postgres
docker-compose restart postgres

# Kiểm tra DATABASE_URL trong .env
cat .env | grep DATABASE_URL
```

### 2. Redis Connection Error

```bash
# Kiểm tra Redis container
docker-compose logs redis

# Test Redis connection
docker exec -it cryptotrack-redis redis-cli ping

# Nên in "PONG"
```

### 3. Binance WebSocket Disconnect

```bash
# Kiểm tra logs backend
docker-compose logs backend | grep binance

# WebSocket sẽ tự reconnect sau 5 giây
```

### 4. Email không gửi được (Mailpit dev)

```bash
# Truy cập Mailpit UI
open http://localhost:8025

# Kiểm logs backend
docker-compose logs backend | grep email

# Kiểm tra SMTP_HOST=mailpit trong .env
```

### 5. Frontend không load (Vite proxy)

```bash
# Kiểm tra Vite config proxy
cat frontend/vite.config.js | grep proxy

# Kiểm tra backend chạy
docker-compose logs backend | head -20

# Restart frontend
docker-compose restart frontend
```

### 6. Build Docker lỗi

```bash
# Clean build
docker-compose down -v
docker system prune -a
docker-compose up --build -d

# Kiểm logs chi tiết
docker-compose logs --tail=100 backend
```

### 7. Latency metrics không cập nhật

```bash
# Kiểm tra client latency_report được emit
# Mở DevTools > Network > WS, tìm latency_report event

# Server tính p50/p95/p99 mỗi 5 giây trong Redis ring buffer
docker exec -it cryptotrack-redis redis-cli
> LRANGE latency:reports 0 -1
```


