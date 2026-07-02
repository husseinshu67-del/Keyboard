# استراتيجية اختبار مشروع Dork Link Collector

## 📋 ملخص المشروع
**اسم المشروع**: Dork Link Collector (Browser Extension)
**النوع**: ملحق متصفح (Chrome/Edge)
**الغرض**: جمع الروابط من نتائج محركات البحث باستخدام استعلامات dorks ثم تصديرها كملف .txt
**التقنيات**: JavaScript, HTML, CSS, Chrome Extension API

---

## 🎯 أهداف استراتيجية الاختبار

### 1. ضمان جودة المنتج
- التحقق من أن جميع الميزات تعمل كما هو متوقع
- اكتشاف الأخطاء والمشاكل قبل الإطلاق
- ضمان توافق المتصفح

### 2. تحسين تجربة المستخدم
- اختبار واجهة المستخدم (UI) و تجربة المستخدم (UX)
- التحقق من استجابات النظام
- اختبار الوصول (Accessibility)

### 3. ضمان الأمن والأمان
- اختبار حماية البيانات
- التحقق من عدم وجود ثغرات أمنية
- اختبار التعامل مع المدخلات الضارة

### 4. ضمان الأداء
- اختبار السرعة والكفاءة
- اختبار استهلاك الموارد
- اختبار التحمل

---

## 📊 أنواع الاختبارات

### 1. اختبارات الوحدة (Unit Tests) ⭐ **أولوية عالية**
**الأدوات المقترحة**: Jest, Mocha, Chai

#### modules تحت الاختبار:

##### background.js
```javascript
// أمثلة على اختبارات الوحدة
describe('buildSearchUrl', () => {
  test('يجب أن تولد URL صحيح لـ Google', () => {
    const url = buildSearchUrl('google', 'test query', 10, 0);
    expect(url).toContain('https://www.google.com/search?q=test+query');
    expect(url).toContain('num=10');
    expect(url).toContain('start=0');
  });

  test('يجب أن تولد URL صحيح لـ Bing', () => {
    const url = buildSearchUrl('bing', 'test', 5, 1);
    expect(url).toContain('https://www.bing.com/search?q=test');
    expect(url).toContain('count=5');
    expect(url).toContain('first=5');
  });

  test('يجب أن تولد URL صحيح لـ DuckDuckGo', () => {
    const url = buildSearchUrl('duckduckgo', 'test', 10, 2);
    expect(url).toContain('https://duckduckgo.com/html/?q=test');
    expect(url).toContain('s=20');
  });

  test('يجب أن تولد URL صحيح لـ Yahoo', () => {
    const url = buildSearchUrl('yahoo', 'test', 8, 3);
    expect(url).toContain('https://search.yahoo.com/search?p=test');
    expect(url).toContain('b=25');
    expect(url).toContain('n=8');
  });
});

describe('scrapePage', () => {
  test('يجب أن ترجع مصفوفة فارغة عند عدم وجود نتائج', () => {
    const result = scrapePage('google'); // مع DOM فارغ
    expect(Array.isArray(result)).toBe(true);
  });

  test('يجب أن ترشح الروابط غير الصالحة', () => {
    // اختبار مع DOM يحتوي على روابط مختلفة
    expect(scrapePage('google')).not.toContain('https://www.google.com');
  });

  test('يجب أن تزيل الروابط المكررة', () => {
    // اختبار مع روابط مكررة
    const results = scrapePage('google');
    const uniqueResults = [...new Set(results)];
    expect(results.length).toBe(uniqueResults.length);
  });
});

describe('sleep', () => {
  test('يجب أن تنتظر المدة المحددة', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(90); // سماح لهامش صغير
  });
});
```

##### popup.js
```javascript
describe('updateUI', () => {
  test('يجب أن تعطل زر التنزيل عندما لا توجد نتائج', () => {
    collected = [];
    updateUI();
    expect(downloadBtn.disabled).toBe(true);
  });

  test('يجب أن تفعّل زر التنزيل عندما توجد نتائج', () => {
    collected = ['http://example.com'];
    updateUI();
    expect(downloadBtn.disabled).toBe(false);
  });

  test('يجب أن تعرض رسالة "لا توجد نتائج" عندما تكون المصفوفة فارغة', () => {
    collected = [];
    updateUI();
    expect(resultsEl.textContent).toContain('لا توجد نتائج');
  });
});

describe('Input Validation', () => {
  test('يجب أن ترجع قيمة افتراضية لـ perDork إذا كانت المدخلات غير صالحة', () => {
    const value = Math.max(1, parseInt('invalid', 10) || 10);
    expect(value).toBe(10);
  });

  test('يجب أن ترجع قيمة افتراضية لـ maxLinks إذا كانت المدخلات غير صالحة', () => {
    const value = Math.max(1, parseInt('', 10) || 100);
    expect(value).toBe(100);
  });

  test('يجب أن تكون throttle لا تقل عن 200', () => {
    const value = Math.max(200, parseInt('100', 10) || 2000);
    expect(value).toBe(200);
  });
});
```

#### assets/main.js
```javascript
describe('Dork Generation', () => {
  test('يجب أن تولد عددًا صحيحًا من dorks', () => {
    const dorks = generateDorks('example.com', 'sqli', 5);
    expect(dorks.length).toBe(5);
  });

  test('يجب أن تحتوي dorks على الهدف المحدد', () => {
    const dorks = generateDorks('test.com', 'sqli', 3);
    dorks.forEach(dork => {
      expect(dork.text).toContain('test.com');
    });
  });

  test('يجب أن تحتوي dorks على نوع المخاطر الصحيح', () => {
    const dorks = generateDorks('example.com', 'sqli', 2);
    dorks.forEach(dork => {
      expect(['h', 'm', 'l']).toContain(dork.risk);
    });
  });
});

describe('buildSearchUrl', () => {
  test('يجب أن تولد URL صحيح لـ Bing', () => {
    const url = buildSearchUrl('test query', 'bing', 1);
    expect(url).toContain('https://www.bing.com/search?q=test+query');
    expect(url).toContain('first=1');
  });

  test('يجب أن تولد URL صحيح لـ Yahoo', () => {
    const url = buildSearchUrl('test', 'yahoo', 2);
    expect(url).toContain('https://search.yahoo.com/search?p=test');
    expect(url).toContain('b=2');
  });
});
```

---

### 2. اختبارات التكامل (Integration Tests) ⭐ **أولوية عالية**

#### اختبار تفاعل المكونات
```javascript
// اختبار تفاعل background.js و popup.js
describe('Extension Communication', () => {
  test('يجب أن يستجيب background لرسالة start', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'start',
      dorks: ['test'],
      perDork: 10,
      maxLinks: 100,
      engine: 'google',
      throttle: 2000
    });
    // التحقق من أن العملية بدأت
    expect(active).toBe(true);
  });

  test('يجب أن يستجيب background لرسالة cancel', async () => {
    await chrome.runtime.sendMessage({ action: 'cancel' });
    expect(controller.cancelRequested).toBe(true);
  });
});
```

#### اختبار تدفق العمل الكامل
1. **اختبار بدء عملية الجمع**:
   - ادخال dorks صالحة
   - الضغط على زر البدء
   - التحقق من بدء العملية
   - التحقق من تحديث واجهة المستخدم

2. **اختبار إلغاء عملية الجمع**:
   - بدء عملية جمع
   - الضغط على زر الإلغاء
   - التحقق من إيقاف العملية
   - التحقق من تحديث واجهة المستخدم

3. **اختبار تنزيل النتائج**:
   - جمع بعض الروابط
   - الضغط على زر التنزيل
   - التحقق من تنزيل ملف .txt
   - التحقق من محتوى الملف

---

### 3. اختبارات واجهة المستخدم (UI Tests) ⭐ **أولوية متوسطة**
**الأدوات المقترحة**: Puppeteer, Playwright, Cypress

#### اختبار العناصر الأساسية
```javascript
// باستخدام Puppeteer
const puppeteer = require('puppeteer');

describe('Popup UI', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=/path/to/extension`,
        `--load-extension=/path/to/extension`
      ]
    });
    page = await browser.newPage();
    await page.goto('chrome://extensions');
  });

  afterAll(async () => {
    await browser.close();
  });

  test('يجب أن تحتوي الصفحة على جميع العناصر الأساسية', async () => {
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    const title = await page.$('h3');
    expect(title).not.toBeNull();
    
    const dorksTextarea = await page.$('#dorks');
    expect(dorksTextarea).not.toBeNull();
    
    const startButton = await page.$('#start');
    expect(startButton).not.toBeNull();
    
    const cancelButton = await page.$('#cancel');
    expect(cancelButton).not.toBeNull();
    
    const downloadButton = await page.$('#download');
    expect(downloadButton).not.toBeNull();
  });

  test('يجب أن تكون زر الإلغاء معطلًا في البداية', async () => {
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    const cancelButton = await page.$('#cancel');
    const isDisabled = await page.evaluate(el => el.disabled, cancelButton);
    expect(isDisabled).toBe(true);
  });

  test('يجب أن تكون زر التنزيل معطلًا في البداية', async () => {
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    const downloadButton = await page.$('#download');
    const isDisabled = await page.evaluate(el => el.disabled, downloadButton);
    expect(isDisabled).toBe(true);
  });
});
```

#### اختبار التفاعل مع المستخدم
1. **اختبار ادخال dorks**:
   - ادخال نص في حقل dorks
   - التحقق من حفظ النص

2. **اختبار تحديد محركات البحث**:
   - تغيير محرك البحث من القائمة المنسدلة
   - التحقق من حفظ الاختيار

3. **اختبار تحديد عدد النتائج**:
   - تغيير قيم perDork و maxLinks
   - التحقق من حفظ القيم

4. **اختبار زر البدء**:
   - الضغط على زر البدء بدون ادخال dorks
   - التحقق من ظهور رسالة خطأ

---

### 4. اختبارات المتصفح (Browser Tests) ⭐ **أولوية متوسطة**

#### اختبار توافق المتصفح
| المتصفح | الإصدار | الحالة |
|---------|---------|--------|
| Chrome | آخر إصدار | ✅ مدعوم |
| Edge | آخر إصدار | ✅ مدعوم |
| Firefox | آخر إصدار | ❌ غير مدعوم (يتطلب تعديل) |
| Safari | آخر إصدار | ❌ غير مدعوم |

#### اختبار الأذونات
```json
// التحقق من أن manifest.json يحتوي على الأذونات اللازمة
{
  "permissions": ["tabs", "scripting", "storage"],
  "host_permissions": [
    "https://www.google.com/*",
    "https://www.bing.com/*",
    "https://duckduckgo.com/*",
    "https://www.duckduckgo.com/*",
    "https://search.yahoo.com/*",
    "https://*.search.yahoo.com/*"
  ]
}
```

#### اختبار تفاعل التاب
1. **اختبار فتح التاب**:
   - التحقق من أن التاب يفتح بشكل صحيح
   - التحقق من أن التاب يغلق بعد الانتهاء

2. **اختبار حقن السكريبت**:
   - التحقق من أن السكريبت يحقن في التاب
   - التحقق من أن السكريبت يستخرج الروابط بشكل صحيح

---

### 5. اختبارات الأداء (Performance Tests) ⭐ **أولوية متوسطة**

#### اختبار السرعة
1. **اختبار وقت استجابة واجهة المستخدم**:
   - قياس الوقت من الضغط على زر البدء حتى ظهور أول تحديث
   - الهدف: أقل من 500ms

2. **اختبار وقت جمع الروابط**:
   - قياس الوقت لجمع 100 رابط
   - الهدف: أقل من 2 دقيقة (اعتمادًا على سرعة الإنترنت)

3. **اختبار وقت تنزيل الملف**:
   - قياس الوقت من الضغط على زر التنزيل حتى اكتمال التنزيل
   - الهدف: أقل من 1 ثانية

#### اختبار استهلاك الموارد
1. **اختبار استهلاك الذاكرة**:
   - قياس استهلاك الذاكرة أثناء جمع 100 رابط
   - الهدف: أقل من 100MB

2. **اختبار استهلاك المعالج**:
   - قياس استهلاك المعالج أثناء جمع 100 رابط
   - الهدف: أقل من 20%

---

### 6. اختبارات الأمن (Security Tests) ⭐ **أولوية عالية**

#### اختبار حماية المدخلات
1. **اختبار حقن SQL**:
   - ادخال استعلامات SQL في حقل dorks
   - التحقق من عدم تنفيذها

2. **اختبار XSS**:
   - ادخال كود JavaScript في حقل dorks
   - التحقق من عدم تنفيذه

3. **اختبار URLs ضارة**:
   - ادخال URLs ضارة
   - التحقق من عدم فتحها

#### اختبار حماية البيانات
1. **اختبار تخزين البيانات**:
   - التحقق من أن البيانات لا تخزن بدون موافقة
   - التحقق من أن البيانات مخزنة بشكل آمن

2. **اختبار نقل البيانات**:
   - التحقق من أن البيانات تنقل عبر HTTPS
   - التحقق من عدم وجود تسرب للبيانات

---

### 7. اختبارات الوصول (Accessibility Tests) ⭐ **أولوية منخفضة**

#### اختبار الوصول الأساسية
1. **اختبار قارئ الشاشة**:
   - التحقق من أن جميع العناصر لها نصوص بديلة
   - التحقق من أن جميع العناصر قابلة للوصول

2. **اختبار لوحة المفاتيح**:
   - التحقق من أن جميع الوظائف تعمل عبر لوحة المفاتيح
   - التحقق من أن التاب يعمل بشكل صحيح

3. **اختبار التباين**:
   - التحقق من أن التباين كافي
   - التحقق من أن الألوان مناسبة

---

### 8. اختبارات التحمل (Endurance Tests) ⭐ **أولوية منخفضة**

#### اختبار التحمل الطويل
1. **اختبار جمع عدد كبير من الروابط**:
   - جمع 1000 رابط
   - التحقق من عدم حدوث أخطاء

2. **اختبار تشغيل طويل**:
   - تشغيل الملحق لمدة 24 ساعة
   - التحقق من عدم حدوث تسرب في الذاكرة

---

## 🛠️ بيئة الاختبار

### المتطلبات
- Node.js (الإصدار 16 أو أعلى)
- npm أو yarn
- Chrome أو Edge (آخر إصدار)
- Puppeteer (لاختبارات المتصفح)
- Jest (لاختبارات الوحدة)

### إعداد البيئة
```bash
# تثبيت الأدوات اللازمة
npm install -g jest puppeteer

# تثبيت التبعيات
npm install jest puppeteer @types/jest --save-dev

# إنشاء ملف configuration
npx jest --init
```

### هيكلية مجلد الاختبارات
```
project/
├── src/
│   ├── background.js
│   ├── popup.js
│   └── assets/
│       └── main.js
├── tests/
│   ├── unit/
│   │   ├── background.test.js
│   │   ├── popup.test.js
│   │   └── main.test.js
│   ├── integration/
│   │   ├── communication.test.js
│   │   └── workflow.test.js
│   ├── e2e/
│   │   ├── popup.test.js
│   │   └── extension.test.js
│   ├── performance/
│   │   └── benchmark.test.js
│   └── security/
│       └── input-validation.test.js
├── package.json
└── jest.config.js
```

---

## 📝 خطة تنفيذ الاختبارات

### المرحلة 1: إعداد بيئة الاختبار (أسبوع 1)
- [ ] تثبيت الأدوات اللازمة
- [ ] إنشاء هيكلية مجلد الاختبارات
- [ ] إعداد ملفات configuration
- [ ] كتابة أول اختبار وحدة

### المرحلة 2: اختبارات الوحدة (أسبوع 2-3)
- [ ] كتابة اختبارات لـ background.js
- [ ] كتابة اختبارات لـ popup.js
- [ ] كتابة اختبارات لـ main.js
- [ ] تشغيل جميع اختبارات الوحدة

### المرحلة 3: اختبارات التكامل (أسبوع 4)
- [ ] كتابة اختبارات تفاعل المكونات
- [ ] كتابة اختبارات تدفق العمل
- [ ] تشغيل جميع اختبارات التكامل

### المرحلة 4: اختبارات واجهة المستخدم (أسبوع 5)
- [ ] كتابة اختبارات UI باستخدام Puppeteer
- [ ] اختبار جميع العناصر الأساسية
- [ ] اختبار التفاعل مع المستخدم

### المرحلة 5: اختبارات المتصفح (أسبوع 6)
- [ ] اختبار توافق المتصفح
- [ ] اختبار الأذونات
- [ ] اختبار تفاعل التاب

### المرحلة 6: اختبارات الأداء (أسبوع 7)
- [ ] اختبار السرعة
- [ ] اختبار استهلاك الموارد

### المرحلة 7: اختبارات الأمن (أسبوع 8)
- [ ] اختبار حماية المدخلات
- [ ] اختبار حماية البيانات

### المرحلة 8: اختبارات الوصول (أسبوع 9)
- [ ] اختبار قارئ الشاشة
- [ ] اختبار لوحة المفاتيح
- [ ] اختبار التباين

### المرحلة 9: اختبارات التحمل (أسبوع 10)
- [ ] اختبار التحمل الطويل
- [ ] اختبار تشغيل طويل

---

## 📊 معيار قبول الاختبارات

### معيار نجاح اختبار الوحدة
- يجب أن تمر جميع اختبارات الوحدة
- يجب أن تكون التغطية الكودية أكثر من 80%

### معيار نجاح اختبار التكامل
- يجب أن تمر جميع اختبارات التكامل
- يجب أن تعمل جميع الميزات بشكل صحيح

### معيار نجاح اختبار واجهة المستخدم
- يجب أن تمر جميع اختبارات UI
- يجب أن تكون واجهة المستخدم خالية من الأخطاء

### معيار نجاح اختبار المتصفح
- يجب أن يعمل الملحق على جميع المتصفحات المدعومة
- يجب أن تكون جميع الأذونات صحيحة

### معيار نجاح اختبار الأداء
- يجب أن تكون جميع مقاييس الأداء ضمن الحدود المقبولة
- يجب أن يكون استهلاك الموارد معقول

### معيار نجاح اختبار الأمن
- يجب أن تكون جميع اختبارات الأمن ناجحة
- يجب أن تكون البيانات محمية

---

## 📈 متابعة وتقييم

### أدوات المتابعة
- **Jest**: لتتبع نتائج اختبارات الوحدة
- **Puppeteer**: لتتبع نتائج اختبارات المتصفح
- **Lighthouse**: لتقييم الأداء والوصول
- **Chrome DevTools**: لتتبع استهلاك الموارد

### تقارير الاختبار
1. **تقرير يومي**:
   - عدد الاختبارات المنفذة
   - عدد الاختبارات الناجحة
   - عدد الاختبارات الفاشلة
   - المشاكل المكتشفة

2. **تقرير أسبوعي**:
   - تقدم تنفيذ خطة الاختبار
   - المشاكل الرئيسية
   - الحلول المقترحة

3. **تقرير نهائي**:
   - ملخص جميع الاختبارات
   - المشاكل المكتشفة والمحلولة
   - التوصيات

---

## 🔧 أدوات اختبارات مقترحة

### أدوات اختبارات الوحدة
- **Jest**: إطار عمل اختبار JavaScript شعبي
- **Mocha**: إطار عمل اختبار مرن
- **Chai**: مكتبة تأكيدات
- **Sinon**: مكتبة للمحاكاة

### أدوات اختبارات المتصفح
- **Puppeteer**: مكتبة لتحكم في Chrome/Edge
- **Playwright**: بديل ل Puppeteer يدعم عدة متصفحات
- **Cypress**: إطار عمل اختبار واجهة المستخدم

### أدوات اختبار الأداء
- **Lighthouse**: أداة من Google لتقييم الأداء
- **WebPageTest**: أداة اختبار أداء الويب
- **Chrome DevTools**: أدوات المطور في Chrome

### أدوات اختبار الأمن
- **OWASP ZAP**: أداة اختبار أمن التطبيقات
- **Burp Suite**: أداة اختبار أمن الويب
- **ESLint Security Plugins**: ملحقات ESLint للأمن

### أدوات اختبار الوصول
- **axe**: أداة اختبار الوصول
- **WAVE**: أداة تقييم الوصول
- **Lighthouse**: يحتوي على اختبارات وصول

---

## 📌 ملاحق

### ملحق 1: أمثلة على اختبارات الوحدة
```javascript
// background.test.js
const { buildSearchUrl, scrapePage, sleep } = require('../src/background');

describe('buildSearchUrl', () => {
  test('Google URL generation', () => {
    const url = buildSearchUrl('google', 'test query', 10, 0);
    expect(url).toBe('https://www.google.com/search?q=test+query&num=10&start=0&hl=en');
  });

  test('Bing URL generation', () => {
    const url = buildSearchUrl('bing', 'test', 5, 1);
    expect(url).toBe('https://www.bing.com/search?q=test&count=5&first=5');
  });

  test('DuckDuckGo URL generation', () => {
    const url = buildSearchUrl('duckduckgo', 'test', 10, 2);
    expect(url).toBe('https://duckduckgo.com/html/?q=test&s=20');
  });

  test('Yahoo URL generation', () => {
    const url = buildSearchUrl('yahoo', 'test', 8, 3);
    expect(url).toBe('https://search.yahoo.com/search?p=test&b=25&n=8');
  });
});

describe('sleep', () => {
  test('should wait for specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(90);
  });
});
```

### ملحق 2: أمثلة على اختبارات التكامل
```javascript
// communication.test.js
const puppeteer = require('puppeteer');

describe('Extension Communication', () => {
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=/path/to/extension`,
        `--load-extension=/path/to/extension`
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should receive progress messages', async () => {
    const page = await browser.newPage();
    await page.goto('chrome-extension://[extension-id]/popup.html');
    
    // محاكاة إرسال رسالة start
    await page.evaluate(() => {
      chrome.runtime.sendMessage({
        action: 'start',
        dorks: ['test'],
        perDork: 10,
        maxLinks: 100,
        engine: 'google',
        throttle: 2000
      });
    });
    
    // التحقق من استلام رسالة progress
    const progressMessage = await page.waitForResponse(response => 
      response.url().includes('progress')
    );
    
    expect(progressMessage).not.toBeNull();
  });
});
```

### ملحق 3: قائمة فحوصات الأمن
- [ ] التحقق من عدم وجود XSS
- [ ] التحقق من عدم وجود SQL Injection
- [ ] التحقق من عدم وجود CSRF
- [ ] التحقق من عدم وجود Clickjacking
- [ ] التحقق من عدم وجود Information Disclosure
- [ ] التحقق من عدم وجود Insecure Storage
- [ ] التحقق من عدم وجود Insecure Communication
- [ ] التحقق من عدم وجود Missing Permissions

---

## 📞 الاتصال والدعم

لأي استفسارات أو دعم فني، يمكنك التواصل عبر:
- **GitHub**: [husseinshu67-del/Keyboard](https://github.com/husseinshu67-del/Keyboard)
- **البريد الإلكتروني**: (إذا كان متاحًا)

---

**ملاحظة**: هذه الاستراتيجية قابلة للتعديل حسب احتياجات المشروع والموارد المتاحة. يوصى بمراجعتها دوريًا وتحديثها حسب التطورات.

---

*تم إنشاء هذا المستند في: 2024*
*الإصدار: 1.0*
