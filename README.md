# 🎓 EduSphere Backend - E-Learning Platform API

[![NestJS Version](https://img.shields.io/badge/NestJS-11.x-red.svg?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.9-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passed-success.svg)]()
[![License: UNLICENSED](https://img.shields.io/badge/License-UNLICENSED-yellow.svg)]()

> **EduSphere Backend** là hệ thống xử lý trung tâm (Backend API) cho nền tảng học trực tuyến E-learning thế hệ mới. Hệ thống được xây dựng trên nền tảng **NestJS**, tuân thủ nguyên tắc **Clean Architecture (3-Tier)**, tích hợp **Real-time WebSockets**, **Stripe Payment Gateway** và **Trợ lý AI (Google Gemini)**.

---

## 📌 Mục lục

- [🎓 EduSphere Backend - E-Learning Platform API](#-edusphere-backend---e-learning-platform-api)
  - [📌 Mục lục](#-mục-lục)
  - [📖 Mô tả Dự án](#-mô-tả-dự-án)
  - [🖼 Trực quan \& Kiến trúc Hệ thống](#-trực-quan--kiến-trúc-hệ-thống)
  - [✨ Tính năng Nổi bật](#-tính-năng-nổi-bật)
  - [📦 Phụ thuộc \& Công nghệ (Dependencies \& Tech Stack)](#-phụ-thuộc--công-nghệ-dependencies--tech-stack)
  - [⚙️ Hướng dẫn Cài đặt \& Thiết lập (Installation \& Setup)](#️-hướng-dẫn-cài-đặt--thiết-lập-installation--setup)
    - [1. Yêu cầu hệ thống (Prerequisites)](#1-yêu-cầu-hệ-thống-prerequisites)
    - [2. Tải về và Cài đặt Packages](#2-tải-về-và-cài-đặt-packages)
    - [3. Cấu hình Biến môi trường (.env)](#3-cấu-hình-biến-môi-trường-env)
    - [4. Khởi tạo Cơ sở dữ liệu (Prisma Migration)](#4-khởi-tạo-cơ-sở-dữ-liệu-prisma-migration)
    - [5. Chạy ứng dụng](#5-chạy-ứng-dụng)
  - [🚀 Cách sử dụng \& Ví dụ Code (Usage \& Code Examples)](#-cách-sử-dụng--ví-dụ-code-usage--code-examples)
    - [Giao tiếp REST API](#giao-tiếp-rest-api)
    - [Giao tiếp Real-time WebSockets (Socket.io)](#giao-tiếp-real-time-websockets-socketio)
  - [❓ Giải đáp Thắc mắc \& Sửa lỗi Thường gặp (Troubleshooting \& FAQ)](#-giải-đáp-thắc-mắc--sửa-lỗi-thường-gặp-troubleshooting--faq)
  - [🚨 Những lỗi đã biết (Known Issues)](#-những-lỗi-đã-biết-known-issues)
  - [📜 Lịch sử Thay đổi (Changelog)](#-lịch-sử-thay-đổi-changelog)
  - [🤝 Hướng dẫn Đóng góp (Contribution Guidelines)](#-hướng-dẫn-đóng-góp-contribution-guidelines)
  - [📞 Hỗ trợ \& Liên hệ (Support \& Contact)](#-hỗ-trợ--liên-hệ-support--contact)
  - [👏 Cảm ơn \& Ghi nhận (Acknowledgements)](#-cảm-ơn--ghi-nhận-acknowledgements)
  - [🔗 Tài liệu Tham khảo \& URL Liên quan](#-tài-liệu-tham-khảo--url-liên-quan)
  - [📄 Giấy phép (License)](#-giấy-phép-license)

---

## 📖 Mô tả Dự án

**EduSphere Backend** giải quyết các bài toán cốt lõi trong việc quản lý và vận hành một nền tảng giáo dục trực tuyến quy mô lớn:

- **Phân quyền và bảo mật tài khoản:** Đảm bảo luồng tương tác an toàn giữa Học viên (Student), Giảng viên (Instructor) và Quản trị viên (Admin).
- **Quy trình sản xuất & Kiểm duyệt khóa học:** Đưa khóa học qua các giai đoạn `DRAFT` $\rightarrow$ `PENDING` $\rightarrow$ `PUBLISHED` / `REJECTED`.
- **Tương tác Thời gian thực (Real-time):** Cung cấp thông báo tức thì (Notifications) và kênh Chat 1-1 riêng tư giữa học viên và giảng viên.
- **Tự động hóa với AI & Payment:** Tích hợp trợ lý trí tuệ nhân tạo trả lời thắc mắc theo bối cảnh bài học và tự động ghi nhận ghi danh khóa học qua Stripe Webhook.

---

## 🖼 Trực quan & Kiến trúc Hệ thống

### Kiến trúc 3 Lớp (3-Tier Architecture)

```mermaid
graph TD
    Client[Client / Frontend / Socket.io] -->|HTTP / WS Request| Controller[Controller / WS Gateway]
    Controller -->|DTO & Interfaces| Service[Service Layer - Core Business]
    Service -->|Prisma Client| Database[(PostgreSQL Database)]
    Service -->|External APIs| External[Stripe / Cloudinary / Google Gemini]
```

### Luồng Xử lý Real-time & WebSockets

```mermaid
sequenceDiagram
    participant Student as Client (Student)
    participant WsGuard as WsAuthMiddleware / WsJwtGuard
    participant Gateway as ChatGateway
    participant Service as ChatService
    participant DB as PostgreSQL

    Student->>WsGuard: Kết nối Socket + JWT Token
    WsGuard-->>Gateway: Xác thực hợp lệ, lưu client.data.user
    Student->>Gateway: emit("send_message", payload)
    Gateway->>Service: sendMessage(conversationId, senderId, content)
    Service->>DB: Save Message & Update Conversation
    Service-->>Gateway: Saved Message
    Gateway->>Student: emit("receive_message", savedMessage)
```

---

## ✨ Tính năng Nổi bật

- 🔐 **Xác thực & Phân quyền Chặt chẽ:** Đăng ký, Đăng nhập JWT, kiểm tra Role dựa trên Guard (`@Roles(Role.INSTRUCTOR)`).
- 📚 **Quản lý Khóa học & Bài giảng:** Phân chia Chương/Bài giảng, đính kèm video, hỗ trợ xem trước bài giảng miễn phí (Free Preview).
- 📝 **Nộp & Chấm điểm Bài tập:** Quản lý hạn nộp (Deadline), hỗ trợ đính kèm nội dung/file, tự động phát thông báo khi có điểm.
- 💳 **Thanh toán Tự động (Stripe Webhook):** Tạo phiên thanh toán Stripe Checkout và tự động kích hoạt Enrollment khi thanh toán hoàn tất.
- 🔔 **Thông báo Real-time (Socket.io):** Gửi thông báo đến đúng User Room khi khóa học được duyệt, có điểm bài tập hoặc mua khóa học thành công.
- 💬 **Kênh Chat 1-1 (Private Q&A):** Độc lập theo phòng chat riêng giữa Học viên & Giảng viên, tự động lưu lịch sử tin nhắn.
- 🤖 **Trợ lý Giảng viên AI (Google Gemini):** Trả lời câu hỏi học viên dựa trên chính nội dung của bài học tương ứng.

---

## 📦 Phụ thuộc & Công nghệ (Dependencies & Tech Stack)

### Core Stack
- **Framework:** NestJS `^11.0.1` (Express Platform)
- **Ngôn ngữ:** TypeScript `^5.7.3` (Strict Mode)
- **Database & ORM:** PostgreSQL + Prisma ORM `^7.9.1` (`@prisma/adapter-pg`)
- **Real-time:** Socket.io via `@nestjs/websockets` & `@nestjs/platform-socket.io` `^11.1.28`

### Third-party Services & Libraries
- **Bảo mật & Auth:** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `passport-local`, `bcrypt`
- **Xác thực dữ liệu (Validation):** `class-validator` `^0.15.1`, `class-transformer` `^0.5.1`
- **Tích hợp ngoài:** `stripe` `^22.4.0`, `@google/genai` `^2.16.0`, `cloudinary` `^2.10.0`
- **Testing:** Jest `^30.0.0`, `ts-jest`, `jest-mock-extended` `^4.0.1`

---

## ⚙️ Hướng dẫn Cài đặt & Thiết lập (Installation & Setup)

### 1. Yêu cầu hệ thống (Prerequisites)
- **Node.js:** `>= 18.x` (Khuyến nghị LTS 20.x hoặc 22.x)
- **npm:** `>= 9.x`
- **PostgreSQL:** `>= 14.x` (Local instance hoặc Cloud DB như Neon/Supabase)

### 2. Tải về và Cài đặt Packages

```bash
# Clone dự án
git clone https://github.com/your-username/edusphere-backend.git
cd edusphere-backend

# Cài đặt tất cả phụ thuộc
npm install
```

### 3. Cấu hình Biến môi trường (.env)

Tạo file `.env` tại thư mục gốc của dự án và điền các giá trị thích hợp:

```env
# Server Config
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/edusphere_db?schema=public"

# JWT Secret Key
JWT_SECRET="super_secret_jwt_key_edusphere_2026"

# Stripe Config
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cloudinary Config (Media Storage)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Google Gemini AI Config
GEMINI_API_KEY="AIzaSy..."
```

### 4. Khởi tạo Cơ sở dữ liệu (Prisma Migration)

```bash
# Tạo các bảng trong Database theo Prisma Schema
npx prisma migrate dev --name init

# Sinh Prisma Client
npx prisma generate
```

### 5. Chạy ứng dụng

```bash
# Chế độ Development (Auto-reload)
npm run start:dev

# Chế độ Production Build
npm run build
npm run start:prod
```

Ứng dụng sẽ hoạt động tại: `http://localhost:3000`

---

## 🚀 Cách sử dụng & Ví dụ Code (Usage & Code Examples)

### Giao tiếp REST API

#### 1. Đăng ký tài khoản (Public)
`POST /auth/register`
```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Nguyen Van A"
}
```

#### 2. Hỏi Trợ lý AI về bài học (Authenticated - JWT Required)
`POST /ai/ask`
```json
{
  "lessonId": "b1a2c3d4-e5f6-7890-abcd-1234567890ab",
  "question": "Vòng đời của một Component trong bài giảng này hoạt động ra sao?"
}
```

### Giao tiếp Real-time WebSockets (Socket.io)

#### Kết nối Kênh Chat 1-1 (`/chat` Namespace)
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'Bearer YOUR_JWT_ACCESS_TOKEN'
  }
});

// Tham gia phòng chat
socket.emit('join_conversation', 'conversation-id-123');

// Gửi tin nhắn
socket.emit('send_message', {
  conversationId: 'conversation-id-123',
  content: 'Chào giảng viên, em có thắc mắc bài tập 1'
});

// Lắng nghe tin nhắn mới
socket.on('receive_message', (message) => {
  console.log('Tin nhắn mới:', message);
});

// Lắng nghe thông báo lỗi
socket.on('error_message', (error) => {
  console.error('Lỗi socket:', error.message);
});
```

---

## ❓ Giải đáp Thắc mắc & Sửa lỗi Thường gặp (Troubleshooting & FAQ)

<details>
<summary><b>1. Lỗi Prisma connection failure / Invalid DATABASE_URL</b></summary>

- **Nguyên nhân:** Chuỗi kết nối Database trong `.env` chưa đúng hoặc PostgreSQL service chưa bật.
- **Khắc phục:** Kiểm tra lại username, password, port (mặc định 5432) và tên database. Đảm bảo bạn có thể kết nối bằng PGAdmin/DBeaver.
</details>

<details>
<summary><b>2. Socket.io Client bị đứt kết nối ngay khi kết nối (Disconnect)</b></summary>

- **Nguyên nhân:** Token JWT trong `handshake.auth.token` thiếu tiền tố `Bearer ` hoặc token đã hết hạn.
- **Khắc phục:** Đảm bảo truyền đúng format `{ auth: { token: "Bearer <token>" } }`.
</details>

<details>
<summary><b>3. Stripe Webhook không kích hoạt Enrollment</b></summary>

- **Nguyên nhân:** Sai `STRIPE_WEBHOOK_SECRET` hoặc chưa cấu hình nghe event `checkout.session.completed`.
- **Khắc phục:** Sử dụng Stripe CLI để forward webhook về local: `stripe listen --forward-to localhost:3000/enrollments/webhook`.
</details>

<details>
<summary><b>4. Chạy `npm run test` bị lỗi import module path (`src/...`)</b></summary>

- **Nguyên nhân:** Jest không tự động hiểu alias path trong `tsconfig.json`.
- **Khắc phục:** Dự án đã cấu hình sẵn `moduleNameMapper` trong `package.json`. Hãy chắc chắn bạn chạy `npx jest`.
</details>

---

## 🚨 Những lỗi đã biết (Known Issues)

1. **Scaffold Spec Files:** Một số file spec khởi tạo mặc định (`.controller.spec.ts`) chưa được mock đầy đủ module phụ thuộc. Bạn nên sử dụng lệnh `npx jest --testPathPatterns="service.spec"` để chạy các bộ Unit Test chính thức.
2. **File Upload Limit:** Upload thumbnail khóa học sử dụng Cloudinary Streamifier hiện đang giới hạn kích thước file 5MB theo mặc định của Multer.

---

## 📜 Lịch sử Thay đổi (Changelog)

### Version `0.0.1` (2026-08-12) - **Clean Code & Test Refactor Release**
- 🐛 **Fix P0 Bugs:** 
  - Fix thiếu `return` trong `findOrCreateConversation`.
  - Fix thiếu `await` trong `reviewCourse`, `chapter.remove`, `lesson.remove`.
- 🏗️ **Refactor Architecture:**
  - Tách `WsAuthMiddleware` & `WsJwtGuard` dùng chung cho tất cả Socket Gateways.
  - Chuyển toàn bộ logic DB của `ChatGateway` về `ChatService.sendMessage()`.
  - Bổ sung cơ chế `error_message` emit ngược về Client khi xảy ra lỗi Socket.
- 🛡️ **Fail-Safe & Type Safety:**
  - Wrapper try/catch với NestJS `Logger` cho `NotificationsService.createNotification`.
  - Thêm `AskQuestionDto` xác thực dữ liệu đầu vào cho AI Endpoint.
  - Loại bỏ các scaffold code rác và sửa typo `enrollemntId`.
- 🧪 **Unit Testing:**
  - Bổ sung 20/20 Test Cases phủ 5 core services chính sử dụng `jest-mock-extended`.

---

## 🤝 Hướng dẫn Đóng góp (Contribution Guidelines)

Chúng tôi luôn hoan nghênh sự đóng góp từ cộng đồng! Để đóng góp:

1. Fork dự án này.
2. Tạo một nhánh tính năng mới (`git checkout -b feature/AmazingFeature`).
3. Cam kết thay đổi của bạn (`git commit -m 'Add some AmazingFeature'`).
4. Đẩy lên nhánh (`git push origin feature/AmazingFeature`).
5. Mở một **Pull Request (PR)**.

> **Lưu ý:** Tất cả PR đều phải chạy qua lint (`npm run lint`), build thành công (`npm run build`) và pass toàn bộ Unit Tests (`npx jest`) trước khi được duyệt.

---

## 📞 Hỗ trợ & Liên hệ (Support & Contact)

- **Đội ngũ Phát triển Backend:** EduSphere Core Engineering Team
- **Email Hỗ trợ:** support@edusphere.example.com
- **Issue Tracker:** [GitHub Issues](https://github.com/your-username/edusphere-backend/issues)

---

## 👏 Cảm ơn & Ghi nhận (Acknowledgements)

- Cảm ơn đội ngũ [NestJS](https://nestjs.com/) vì một framework tuyệt vời.
- Cảm ơn cộng đồng [Prisma](https://www.prisma.io/) và [Socket.io](https://socket.io/).
- Trợ lý AI tích hợp sử dụng công nghệ của [Google Gemini API](https://ai.google.dev/).

---

## 🔗 Tài liệu Tham khảo & URL Liên quan

- [Tài liệu chính thức NestJS](https://docs.nestjs.com/)
- [Tài liệu Prisma ORM](https://www.prisma.io/docs)
- [Tài liệu Stripe API & Webhooks](https://stripe.com/docs/api)
- [Tài liệu Google Gen AI SDK](https://www.npmjs.com/package/@google/genai)

---

## 📄 Giấy phép (License)

Dự án này là mã nguồn nội bộ độc quyền (UNLICENSED). Vui lòng không sao chép hoặc phân phối lại khi chưa có sự đồng ý của quản trị viên.
