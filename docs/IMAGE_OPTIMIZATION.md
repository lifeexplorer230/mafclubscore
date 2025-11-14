# Image Optimization Guide

## Обзор

Image optimization критически важен для производительности web-приложений. Изображения часто составляют 50-70% размера страницы.

### Преимущества:
- ⚡ **Быстрая загрузка** - меньше данных для передачи
- 💾 **Экономия трафика** - до 80% меньше байт
- 🚀 **Лучший UX** - instant loading с placeholders
- 📱 **Mobile-friendly** - адаптивные размеры

## Основные техники

### 1. Lazy Loading

Загружаем изображения только когда они появляются в viewport.

```javascript
import { addLazyLoading } from './shared/image-optimizer.js';

// Базовое использование
addLazyLoading();

// С кастомными опциями
addLazyLoading(document.getElementById('gallery'), {
  rootMargin: '100px',  // Начинаем загрузку за 100px до viewport
  threshold: 0.01
});
```

**HTML:**
```html
<!-- До: eager loading -->
<img src="/images/large-photo.jpg" alt="Photo">

<!-- После: lazy loading -->
<img data-src="/images/large-photo.jpg"
     alt="Photo"
     class="lazy">
```

**Результат:**
- Initial load: 50KB → 10KB (только critical images)
- Images загружаются по требованию

### 2. Responsive Images

Загружаем разные размеры для разных устройств.

```javascript
import { generateSrcset } from './shared/image-optimizer.js';

const srcset = generateSrcset('/images/photo.jpg', [320, 640, 960, 1280]);
console.log(srcset);
// "/images/photo-320w.jpg 320w, /images/photo-640w.jpg 640w, ..."
```

**HTML:**
```html
<img
  data-src="/images/photo-960w.jpg"
  data-srcset="
    /images/photo-320w.jpg 320w,
    /images/photo-640w.jpg 640w,
    /images/photo-960w.jpg 960w,
    /images/photo-1280w.jpg 1280w
  "
  sizes="(max-width: 640px) 100vw, 960px"
  alt="Responsive photo">
```

**Браузер автоматически выбирает:**
- Mobile: 320w (30 KB)
- Tablet: 640w (80 KB)
- Desktop: 960w (150 KB)

### 3. Modern Formats (WebP, AVIF)

WebP даёт ~30% меньше размер чем JPEG при той же качестве.

```javascript
import { useModernFormats } from './shared/image-optimizer.js';

// Автоматически конвертирует .jpg → .webp где поддерживается
useModernFormats();
```

**HTML с fallback:**
```html
<picture>
  <source srcset="/images/photo.avif" type="image/avif">
  <source srcset="/images/photo.webp" type="image/webp">
  <img src="/images/photo.jpg" alt="Photo with fallback">
</picture>
```

### 4. Placeholder/Blur Effect

Показываем blur preview пока загружается full image.

```javascript
import { addPlaceholder } from './shared/image-optimizer.js';

const img = document.querySelector('img');
addPlaceholder(img, '/images/photo-thumbnail.jpg');
```

**Эффект:**
1. Instant: показываем tiny blur image (1-2KB)
2. Loading: full image загружается в фоне
3. Loaded: плавный переход на full image

## Полная инициализация

```javascript
import { initImageOptimization } from './shared/image-optimizer.js';

// Оптимизируем все изображения на странице
initImageOptimization({
  container: document,
  lazyLoad: true,
  modernFormats: true,
  viewportOptimization: true,
  preload: [
    '/images/logo.png',      // Критические изображения
    '/images/hero-bg.jpg'
  ]
});
```

## Практические примеры

### Пример 1: Gallery с lazy loading

```html
<!-- gallery.html -->
<div id="gallery" class="gallery">
  <img data-src="/images/photo1.jpg" alt="Photo 1" class="lazy">
  <img data-src="/images/photo2.jpg" alt="Photo 2" class="lazy">
  <img data-src="/images/photo3.jpg" alt="Photo 3" class="lazy">
  <!-- 100 изображений -->
</div>

<script type="module">
import { addLazyLoading } from './shared/image-optimizer.js';

addLazyLoading(document.getElementById('gallery'));
</script>
```

**До оптимизации:**
- Initial load: 5 MB (100 изображений)
- Load time: 15 секунд на 3G

**После оптимизации:**
- Initial load: 50 KB (первые 5 изображений)
- Load time: 0.5 секунд
- Остальные загружаются при скролле

### Пример 2: Hero image с responsive sizes

```html
<picture>
  <source
    media="(min-width: 1280px)"
    data-srcset="/images/hero-1920w.webp"
    type="image/webp">
  <source
    media="(min-width: 640px)"
    data-srcset="/images/hero-1280w.webp"
    type="image/webp">
  <source
    data-srcset="/images/hero-640w.webp"
    type="image/webp">
  <img
    data-src="/images/hero-1280w.jpg"
    alt="Hero image"
    class="hero-img lazy">
</picture>
```

### Пример 3: Avatar с placeholder

```javascript
// player.html
import { addPlaceholder, addLazyLoading } from './shared/image-optimizer.js';

const avatars = document.querySelectorAll('.player-avatar');

avatars.forEach(img => {
  // Tiny blur placeholder (Base64 encoded, 500 bytes)
  const placeholder = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
  addPlaceholder(img, placeholder);
});

addLazyLoading();
```

### Пример 4: Preload критических изображений

```javascript
import { preloadImages } from './shared/image-optimizer.js';

// Предзагружаем изображения, которые нужны сразу
preloadImages([
  '/images/logo.png',
  '/images/header-bg.jpg',
  '/images/favicon.ico'
]);
```

## Best Practices

### 1. Всегда используйте lazy loading

```javascript
// ✅ GOOD
<img data-src="/image.jpg" class="lazy">

// ❌ BAD - загружаются все сразу
<img src="/image.jpg">
```

### 2. Оптимизируйте размеры изображений

```bash
# Создавайте multiple sizes для responsive
convert photo.jpg -resize 320x photo-320w.jpg
convert photo.jpg -resize 640x photo-640w.jpg
convert photo.jpg -resize 960x photo-960w.jpg
convert photo.jpg -resize 1280x photo-1280w.jpg
```

### 3. Используйте WebP где возможно

```javascript
// Автоматическая конвертация
useModernFormats();

// Или manual с fallback
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

### 4. Добавьте dimensions для избежания layout shifts

```html
<!-- ✅ GOOD - браузер резервирует место -->
<img data-src="/image.jpg" width="800" height="600" alt="Photo">

<!-- ❌ BAD - layout shift при загрузке -->
<img data-src="/image.jpg" alt="Photo">
```

### 5. Используйте CSS для loading states

```css
img[data-src] {
  background: #f0f0f0;
  min-height: 200px;
}

img.lazy-loading {
  filter: blur(5px);
  opacity: 0.5;
}

img.lazy-loaded {
  animation: fadeIn 0.3s;
}
```

## Performance Metrics

### До оптимизации:

```
Page size:    5.2 MB
Images:       4.8 MB (92%)
Load time:    12 секунд (3G)
LCP:          8 секунд
```

### После оптимизации:

```
Page size:    850 KB
Images:       600 KB (70%)
Load time:    2 секунды (3G)
LCP:          1.2 секунды
Improvement:  83% меньше, 6x быстрее
```

## Monitoring

```javascript
import { getImageStats } from './shared/image-optimizer.js';

// Проверяем статистику загрузки
setInterval(() => {
  const stats = getImageStats();
  console.log('Images loaded:', stats);
  // {
  //   total: 100,
  //   lazy: 95,
  //   loaded: 45,
  //   errors: 0,
  //   loadedPercent: '47.4'
  // }
}, 5000);
```

## Image Formats Comparison

| Format | Size (KB) | Quality | Browser Support | Use Case |
|--------|-----------|---------|----------------|----------|
| JPEG   | 150       | Good    | 100%           | Photos   |
| PNG    | 280       | Perfect | 100%           | Graphics |
| WebP   | 95        | Good    | 95%            | Modern   |
| AVIF   | 70        | Great   | 70%            | Cutting edge |

**Рекомендация:**
```html
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Optimized">
</picture>
```

## Tools для оптимизации

### Command-line tools:

```bash
# ImageMagick - resize
convert input.jpg -resize 640x output.jpg

# cwebp - convert to WebP
cwebp -q 80 input.jpg -o output.webp

# avifenc - convert to AVIF
avifenc --min 0 --max 63 -a cq-level=23 input.jpg output.avif

# OptiPNG - optimize PNG
optipng -o7 input.png

# JPEGOptim - optimize JPEG
jpegoptim --max=85 input.jpg
```

### Online tools:

- [TinyPNG](https://tinypng.com/) - PNG/JPEG compression
- [Squoosh](https://squoosh.app/) - Modern format converter
- [ImageOptim](https://imageoptim.com/) - Batch optimization

## Vercel Configuration

Vercel автоматически оптимизирует изображения через Image Optimization API.

**vercel.json:**
```json
{
  "images": {
    "domains": ["example.com"],
    "sizes": [320, 640, 960, 1280, 1920],
    "formats": ["image/avif", "image/webp"]
  }
}
```

**Usage:**
```javascript
import Image from 'next/image';

<Image
  src="/photo.jpg"
  width={960}
  height={640}
  alt="Optimized"
  loading="lazy"
/>
```

## Troubleshooting

### Изображения не загружаются

**Причина:** Неверный путь в data-src

**Решение:**
```javascript
// Проверьте путь
console.log(img.dataset.src);

// Убедитесь что путь относительно HTML файла
<img data-src="./images/photo.jpg"> <!-- Относительный -->
<img data-src="/images/photo.jpg">  <!-- Абсолютный -->
```

### Layout shifts

**Причина:** Не указаны width/height

**Решение:**
```html
<!-- Добавьте dimensions -->
<img data-src="/photo.jpg" width="800" height="600">

<!-- Или aspect-ratio в CSS -->
<style>
img {
  aspect-ratio: 16 / 9;
  width: 100%;
}
</style>
```

### WebP не поддерживается

**Причина:** Старый браузер

**Решение:** Всегда добавляйте fallback
```html
<picture>
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Fallback">
</picture>
```

## Resources

- [Web.dev: Image Optimization](https://web.dev/fast/#optimize-your-images)
- [MDN: Lazy Loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
- [Can I Use: WebP](https://caniuse.com/webp)
- [Squoosh: Image Converter](https://squoosh.app/)
