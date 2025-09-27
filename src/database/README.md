# Database Migrations and Seeders

Bu qovluq veritabanı migration və seeder fayllarını ehtiva edir.

## Struktur

```
src/database/
├── migrations/          # Veritabanı cədvəl yaradılması
│   ├── 001_create_users_table.js
│   └── 002_create_user_settings_table.js
├── seeders/            # Test məlumatları
│   └── 001_seed_users.js
├── migrate.js          # Migration runner
├── seed.js             # Seeder runner
└── README.md           # Bu fayl

src/config/
└── db.js               # Veritabanı konfiqurasiyası
```

## Quraşdırma

Layihəni yeni qurduqda avtomatik olaraq migration və seeder-lər işə düşəcək:

```bash
# Layihəni klonla
git clone <repository-url>
cd skalp

# Dependencies quraşdır (avtomatik migration/seeder işə düşəcək)
npm install

# Serveri başlat
npm start
```

## İstifadə

### Migrations

```bash
# Bütün migration-ları işə sal
npm run migrate

# Migration-ları geri qaytar
npm run migrate:rollback
```

### Seeders

```bash
# Bütün seeder-ləri işə sal
npm run seed

# Seeder-ləri geri qaytar
npm run seed:rollback
```

### Tam quraşdırma

```bash
# Həm migration, həm də seeder-ləri işə sal
npm run db:setup
```

## Migration Faylları

Migration faylları `up()` və `down()` funksiyalarını ehtiva etməlidir:

- `up()` - cədvəl yaradır və ya dəyişiklik edir
- `down()` - dəyişiklikləri geri qaytarır

## Seeder Faylları

Seeder faylları test məlumatları əlavə edir:

- `up()` - test məlumatları əlavə edir
- `down()` - test məlumatlarını silir

## Konfiqurasiya

Bütün veritabanı konfiqurasiyası `src/config/db.js` faylında saxlanılır və bütün migration/seeder faylları bu konfiqurasiyadan istifadə edir.

## Məlumatlar

- Migration və seeder-lər sıra ilə işə salınır (001, 002, 003...)
- Hər migration/seeder yalnız bir dəfə işə salınır
- `migrations` və `seeders` cədvəlləri avtomatik yaradılır
- Bütün fayllar eyni veritabanı konfiqurasiyasından istifadə edir
