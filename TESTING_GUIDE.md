# دليل اختبار مشروع Dork Link Collector

## 📖 مقدمة

هذا الدليل يشرح كيفية تنفيذ استراتيجية الاختبار لمشروع **Dork Link Collector**. يحتوي المشروع على اختبارات وحدة، تكامل، وأمان لضمان جودة المنتج وسلامته.

---

## 🚀 البدء السريع

### متطلبات النظام
- Node.js (الإصدار 16 أو أعلى)
- npm أو yarn
- Chrome أو Edge (آخر إصدار)

### تثبيت التبعيات
```bash
# في مجلد المشروع
npm install
```

### تشغيل الاختبارات
```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبارات الوحدة فقط
npm run test:unit

# تشغيل اختبارات التكامل فقط
npm run test:integration

# تشغيل اختبارات E2E فقط
npm run test:e2e

# تشغيل الاختبارات مع تغطية الكود
npm run test:coverage

# تشغيل الاختبارات في وضع المراقبة
npm run test:watch
```

---

## 📁 هيكلية مجلد الاختبارات

```
project/
├── tests/
│   ├── unit/                    # اختبارات الوحدة
│   │   ├── background.test.js   # اختبار background.js
│   │   ├── popup.test.js        # اختبار popup.js
│   │   └── assets.test.js       # اختبار assets/main.js
│   │
│   ├── integration/             # اختبارات التكامل
│   │   └── workflow.test.js     # اختبار تدفق العمل الكامل
│   │
│   ├── e2e/                     # اختبارات نهاية إلى نهاية
│   │   └── popup.test.js        # اختبار واجهة المستخدم
│   │
│   └── security/                # اختبارات الأمن
│       └── input-validation.test.js  # اختبار حماية المدخلات
│
├── package.json                 # تبعيات المشروع
├── jest.config.js              # إعدادات Jest
├── tests/setup.js              # إعداد بيئة الاختبار
└── TESTING_STRATEGY.md          # استراتيجية الاختبار
```

---

## 🧪 أنواع الاختبارات

### 1. اختبارات الوحدة (Unit Tests)

اختبارات الوحدة تختبر وظائف فردية ومعزولة. في هذا المشروع، نختبر:

- **background.js**: وظائف بناء URLs، استخراج الروابط، إلخ
- **popup.js**: وظائف واجهة المستخدم، معالجة المدخلات
- **assets/main.js**: وظائف توليد dorks، معالجة النتائج

**أمثلة:**
```javascript
// اختبار بناء URL
const url = buildSearchUrl('google', 'test query', 10, 0);
expect(url).toBe('https://www.google.com/search?q=test%20query&num=10&start=0&hl=en');

// اختبار استخراج الروابط
const results = scrapePage('google');
expect(results).toContain('https://example.com');
```

### 2. اختبارات التكامل (Integration Tests)

اختبارات التكامل تختبر تفاعل عدة مكونات معًا. في هذا المشروع، نختبر:

- تفاعل background.js و popup.js
- تدفق العمل الكامل من البداية إلى النهاية
- معالجة الرسائل بين المكونات

**أمثلة:**
```javascript
// اختبار تدفق العمل الكامل
startHandler(); // بدء عملية الجمع
// انتظار الانتهاء
// التحقق من النتائج
```

### 3. اختبارات الأمن (Security Tests)

اختبارات الأمن تختبر حماية النظام من الثغرات الشائعة:

- **XSS**: حماية من حقن كود JavaScript
- **SQL Injection**: حماية من حقن استعلامات SQL
- **URL Injection**: حماية من URLs ضارة
- **Input Validation**: التحقق من صحة المدخلات

**أمثلة:**
```javascript
// اختبار حماية XSS
const maliciousInput = '<script>alert("XSS")</script>';
const url = buildSearchUrl('google', maliciousInput, 10, 0);
expect(url).not.toContain('<script>');

// اختبار حماية SQL Injection
const sqlInjection = "' OR '1'='1";
const url = buildSearchUrl('google', sqlInjection, 10, 0);
expect(url).toContain('%27%20OR%20%271%27%3D%271');
```

---

## 🛡️ أفضل ممارسات الاختبار

### 1. كتابة اختبارات جيدة

- **مبدأ F.I.R.S.T.**:
  - **Fast**: يجب أن تكون الاختبارات سريعة
  - **Isolated**: يجب أن تكون الاختبارات معزولة عن بعضها
  - **Repeatable**: يجب أن يمكن تكرارها للحصول على نفس النتيجة
  - **Self-validating**: يجب أن تختبر نفسها
  - **Timely**: يجب كتابتها في الوقت المناسب

- **مبدأ A.A.A.**:
  - **Arrange**: إعداد البيانات
  - **Act**: تنفيذ العمل
  - **Assert**: التحقق من النتيجة

### 2. تغطية الكود

هدف إلى تغطية أكثر من 80% من الكود. يمكنك تشغيل:
```bash
npm run test:coverage
```

### 3. اختبارات الأمن

- اختبار جميع المدخلات ضد الهجمات الشائعة
- التحقق من تصفية الروابط الضارة
- اختبار حماية البيانات

---

## 🔧 أدوات الاختبار المستخدمة

### 1. Jest
إطار عمل اختبار JavaScript شعبي:
- دعم اختبارات الوحدة والتكامل
- ميزات محاكاة (mocking) قوية
- تغطية الكود

### 2. Puppeteer
مكتبة للتحكم في Chrome/Edge:
- اختبار واجهة المستخدم
- اختبار تفاعل المتصفح
- اختبار الأداء

### 3. ESLint
أداة لتحليل الكود:
- اكتشاف الأخطاء المحتملة
- فرض أسلوب كتابة الكود
- تحسين جودة الكود

---

## 📊 متابعة الاختبارات

### تقارير الاختبار

بعد تشغيل الاختبارات، يمكنك رؤية:

1. **تقرير نصي**: في الطرفية
2. **تقرير HTML**: في مجلد `coverage/`
3. **تقرير LCOV**: لتكامل مع أدوات CI/CD

### تكامل مع CI/CD

يمكنك تكامل الاختبارات مع GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm test
```

---

## 🐛 استكشاف الأخطاء وإصلاحها

### مشاكل شائعة

1. **خطأ في تثبيت التبعيات**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **اختبارات فاشلة**:
   - تحقق من أن جميع التبعيات مثبتة
   - تحقق من أن بيئة الاختبار مضبوطة بشكل صحيح
   - تحقق من أن mocks تعمل بشكل صحيح

3. **مشاكل في تغطية الكود**:
   - تأكد من أن جميع الملفات مشمولة في `collectCoverageFrom`
   - تأكد من أن الاختبارات تغطي جميع الحالات

---

## 📚 الموارد

### وثائق
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Puppeteer Documentation](https://pptr.dev/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)

### أمثلة
- [Jest Examples](https://jestjs.io/docs/en/tutorial-react)
- [Puppeteer Examples](https://pptr.dev/#?product=Puppeteer&version=v21.6.0&show=api)

---

## 🤝 المساهمة

إذا كنت ترغب في المساهمة في تحسين الاختبارات:

1. قم بfork للمشروع
2. قم بإنشاء branch جديد (`git checkout -b feature/test-improvements`)
3. قم بإجراء التغييرات
4. قم بفتح Pull Request

---

## 📞 الدعم

لأي استفسارات أو دعم:
- فتح Issue في [GitHub Repository](https://github.com/husseinshu67-del/Keyboard)
- قراءة [TESTING_STRATEGY.md](TESTING_STRATEGY.md) للحصول على تفاصيل كاملة

---

**ملاحظة**: هذا الدليل قابل للتعديل حسب احتياجات المشروع. يوصى بمراجعته دوريًا وتحديثه حسب التطورات.
