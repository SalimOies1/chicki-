// يحوّل شعار المطعم (assets/images/logo.jpg) إلى وحدة JS تحتوي الصورة كنص
// base64، لتُضمَّن مباشرة في الصفحة عبر <script> بدل جلبها بـ fetch (يعمل even
// عند فتح index.html مباشرة من القرص بدون خادم محلي، وبدون الاعتماد على أي شبكة).
// نفس أسلوب scripts/build-font-data.js تمامًا.
//
// شغّل هذا السكربت يدويًا فقط عند تغيير ملف الشعار:
//   node scripts/build-logo-data.js

const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'assets', 'images', 'logo.jpg');
const outPath = path.join(__dirname, '..', 'js', 'vendor', 'logo-data.js');

const base64 = fs.readFileSync(logoPath).toString('base64');
const content = '// تم إنشاؤه تلقائيًا بواسطة scripts/build-logo-data.js من assets/images/logo.jpg — لا تعدّله يدويًا.\n' +
  'window.LOGO_BASE64 = "' + base64 + '";\n' +
  'window.LOGO_FORMAT = "JPEG";\n';

fs.writeFileSync(outPath, content);
console.log('Wrote ' + outPath + ' (' + (content.length / 1024).toFixed(1) + ' KB)');
