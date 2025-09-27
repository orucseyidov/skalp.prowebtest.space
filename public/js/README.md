# JavaScript Files Organization

Bu qovluq bütün JavaScript fayllarını ehtiva edir.

## Fayl Strukturu

### `app.js`
- **Məqsəd**: Umumi JavaScript funksionallığı
- **İçində**: 
  - Chart funksionallığı (LightweightCharts)
  - Trading controls (symbol, interval, limit)
  - Technical indicators (RSI, MA, EMA)
  - WebSocket connections
  - Preferences management
  - Auto-reload functionality
  - **Utility functions**: showSuccess, showError, showLoading, confirmAction
  - **Cache management**: setupCacheClearButton (bütün səhifələrdə işləyir)

### `home.js`
- **Məqsəd**: Home səhifəsinə xas JavaScript funksionallığı
- **İçində**:
  - Scalp analysis functions (refreshScalp)
  - AI analysis functions (refreshAI)
  - Home page specific event listeners
  - Scalp loading management

## İstifadə

### Base Layout (head-extra.edge)
```html
<script src="/js/app.js"></script>
```

### Home Page (home.edge)
```html
@section('scripts')
  <script src="/js/home.js"></script>
@end
```

## Utility Functions (app.js-də mövcuddur)

Bütün səhifələrdə istifadə edilə bilən funksiyalar:

```javascript
// Success mesajı göstər
window.showSuccess('Əməliyyat uğurlu oldu');

// Error mesajı göstər
window.showError('Xəta baş verdi');

// Loading göstər
window.showLoading('Yüklənir...', 'Zəhmət olmasa gözləyin');

// Təsdiq dialoqu
window.confirmAction('Silmək istəyirsiniz?', 'Bu əməliyyat geri alına bilməz')
  .then((result) => {
    if (result.isConfirmed) {
      // Təsdiq edildi
    }
  });
```

## Gələcək Genişləndirmələr

Yeni səhifələr üçün JavaScript faylları bu qovluğa əlavə edilə bilər:
- `test.js` - Test səhifəsi üçün
- `profile.js` - Profil səhifəsi üçün
- `settings.js` - Ayarlar səhifəsi üçün

## Qaydalar

1. **Fayl adları**: kiçik hərflər və tire istifadə edin (`home.js`, `test-page.js`)
2. **Namespace**: Hər fayl öz IIFE (Immediately Invoked Function Expression) istifadə etsin
3. **Global dəyişənlər**: Minimal istifadə edin, `window` obyektinə yalnız lazım olduqda əlavə edin
4. **Dependencies**: jQuery və Bootstrap artıq global olaraq mövcuddur
