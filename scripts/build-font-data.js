// يحوّل ملفات الخط (.ttf) في assets/fonts إلى وحدات JS تحتوي الخط كنص base64،
// لتُضمَّن مباشرة في الصفحة عبر <script> بدل جلبها بـ fetch (يعمل even عند فتح
// index.html مباشرة من القرص بدون خادم محلي، وبدون الاعتماد على أي شبكة).
//
// شغّل هذا السكربت يدويًا فقط عند تغيير أو إضافة خط جديد:
//   node scripts/build-font-data.js

const fs = require('fs');
const path = require('path');

const FONTS = [
  { file: 'NotoNaskhArabic-Regular.ttf', varName: 'ARABIC_FONT_REGULAR_BASE64', out: 'arabic-font-regular-data.js' },
  { file: 'NotoNaskhArabic-Bold.ttf', varName: 'ARABIC_FONT_BOLD_BASE64', out: 'arabic-font-bold-data.js' }
];

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
const outDir = path.join(__dirname, '..', 'js', 'vendor');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

FONTS.forEach(function (f) {
  const ttfPath = path.join(fontsDir, f.file);
  const base64 = fs.readFileSync(ttfPath).toString('base64');
  const outPath = path.join(outDir, f.out);
  const content = '// تم إنشاؤه تلقائيًا بواسطة scripts/build-font-data.js من ' + f.file + ' — لا تعدّله يدويًا.\n' +
    'window.' + f.varName + ' = "' + base64 + '";\n';
  fs.writeFileSync(outPath, content);
  console.log('Wrote ' + outPath + ' (' + (content.length / 1024).toFixed(1) + ' KB)');
});
