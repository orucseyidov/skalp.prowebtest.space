# Skalp Trading Platform

Skalp ticarət platforması - kriptovalyuta ticarəti üçün avtomatik tövsiyələr və analiz.

## Quraşdırma

### Tələblər

- Node.js (v16 və ya daha yeni)
- MySQL (v8.0 və ya daha yeni)
- npm

### Addımlar

1. **Layihəni klonla**
   ```bash
   git clone <repository-url>
   cd skalp
   ```

2. **Environment faylı yarat**
   ```bash
   cp .env.example .env
   ```
   
   `.env` faylını redaktə et və veritabanı məlumatlarını daxil et:
   ```env
   PORT=3000
   SESSION_SECRET=your_secret_key_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=root
   DB_NAME=skalp
   NODE_ENV=development
   ```

3. **MySQL veritabanı yarat**
   ```sql
   CREATE DATABASE skalp;
   ```

4. **Dependencies quraşdır**
   ```bash
   npm install
   ```
   
   Bu əmr avtomatik olaraq:
   - Migration-ları işə salacaq (cədvəllər yaradılacaq)
   - Seeder-ləri işə salacaq (test məlumatları əlavə ediləcək)

5. **Serveri başlat**
   ```bash
   npm start
   ```

6. **Brauzerdə aç**
   ```
   http://localhost:3000
   ```

## İstifadə

### Default istifadəçi

- **Email**: oruc@example.com
- **Şifrə**: password123

### Əmrlər

```bash
# Serveri başlat
npm start

# Development rejimi
npm run dev

# Migration-ları işə sal
npm run migrate

# Seeder-ləri işə sal
npm run seed

# Veritabanını tam quraşdır
npm run db:setup

# Migration-ları geri qaytar
npm run migrate:rollback

# Seeder-ləri geri qaytar
npm run seed:rollback
```

## Struktur

```
src/
├── config/
│   └── db.js              # Veritabanı konfiqurasiyası
├── controllers/           # API controller-ləri
│   ├── auth.controller.js
│   ├── binance.controller.js # Binance API controller
│   ├── cache.controller.js # Cache management controller
│   ├── me.controller.js
│   ├── profile.controller.js # Profile management controller
│   └── user.controller.js
├── database/
│   ├── migrations/        # Veritabanı migration-ları
│   ├── seeders/          # Test məlumatları
│   ├── migrate.js        # Migration runner
│   └── seed.js           # Seeder runner
├── middlewares/          # Express middleware-ləri
│   ├── auth.js           # Authentication middleware
│   ├── cors.js           # CORS middleware
│   ├── rateLimit.js      # Rate limiting middleware
│   └── session.js        # Session middleware
├── exceptions/           # Error handling
│   ├── HttpException.js  # Base HTTP exception
│   ├── NotFoundException.js # 404 exception
│   └── ErrorHandler.js   # Global error handler
├── models/               # Veritabanı modelləri
├── repositories/         # Data access layer
│   ├── user.repository.js # User database operations
│   ├── user-settings.repository.js # User settings operations
│   └── user.repository.contract.js # User repository interface
├── queries/              # Complex SQL queries
│   └── dashboard-stats.query.js # Dashboard statistics
├── routes/               # API route-ları
│   ├── index.js          # Ana route giriş noktası
│   ├── auth.routes.js    # Auth endpoint-ləri
│   ├── api.routes.js     # API endpoint-ləri
│   ├── view.routes.js    # View endpoint-ləri
│   ├── me.routes.js      # Me endpoint-ləri
│   └── user.routes.js    # User endpoint-ləri
├── services/             # Business logic
│   ├── binance.js        # Binance API service
│   └── deepseek.service.js # DeepSeek AI service
├── utils/                # Yardımçı funksiyalar
└── views/                # Edge template-ləri
    ├── layouts/          # Layout template-ləri
    ├── pages/            # Səhifə template-ləri
    └── partials/         # Parçalı template-lər
```

## Xüsusiyyətlər

- **Responsive Design**: Mobil və desktop uyğun
- **Real-time Charts**: TradingView inteqrasiyası
- **AI Analysis**: DeepSeek AI analizi
- **Scalp Recommendations**: Avtomatik ticarət tövsiyələri
- **User Management**: İstifadəçi profili və ayarları
- **Session Management**: Təhlükəsiz session idarəetməsi

## Texnologiyalar

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Template Engine**: Edge.js
- **Frontend**: Bootstrap 5, jQuery
- **Charts**: TradingView Widget
- **Authentication**: Express Session, bcrypt

## Təhlükəsizlik

- Şifrələr bcrypt ilə hash edilir
- Session-based authentication
- CORS konfiqurasiyası
- Rate limiting
- Input validation

## Dəstək

Hər hansı problem üçün issue yaradın və ya pull request göndərin.
