// وحدة تشكيل النص العربي لملفات PDF
//
// لا تقوم مكتبات PDF (مثل jsPDF) بربط الحروف العربية ببعضها تلقائيًا (Shaping)
// ولا بترتيب النص من اليمين لليسار (Bidi) — فهي تكتب كل رمز يونيكود كما هو، بشكل
// منفصل ومن اليسار لليمين دائمًا. هذه الوحدة تحوّل نصًا عربيًا عاديًا إلى نص "جاهز
// للرسم": الحروف مستبدلة بأشكال العرض الصحيحة (منفصل/بداية/وسط/نهاية) بحسب موقعها،
// ومُعاد ترتيبها بصريًا بحيث يعطي doc.text() (بالرسم العادي من اليسار لليمين) نتيجة
// عربية صحيحة الشكل والاتجاه.

var App = window.App || {};

App.ArabicText = {};

var LAM = 'ل';

// حروف الألف التي تُكوّن مع اللام رباطًا إلزاميًا (لا، لأ، لإ، لآ)
var LAM_ALEF_LIGATURES = {
  'آ': { isolated: 'ﻵ', final: 'ﻶ' }, // لآ
  'أ': { isolated: 'ﻷ', final: 'ﻸ' }, // لأ
  'إ': { isolated: 'ﻹ', final: 'ﻺ' }, // لإ
  'ا': { isolated: 'ﻻ', final: 'ﻼ' }  // لا
};

// جدول أشكال الحروف العربية الأساسية: لكل حرف شكله المنفصل، وإن كان الحرف
// "ثنائي الاتصال" (يتصل بما قبله وبعده) نضيف أشكال البداية والوسط والنهاية.
// الحروف "أحادية الاتصال من اليمين" (مثل ا د ذ ر ز و) لا تتصل بما بعدها إطلاقًا،
// لذلك لا تملك سوى شكلين: منفصل ونهاية.
var JOIN_TABLE = {
  'ء': { joinsPrev: false, joinsNext: false, isolated: 'ﺀ' }, // ء
  'آ': { joinsPrev: true, joinsNext: false, isolated: 'ﺁ', final: 'ﺂ' }, // آ
  'أ': { joinsPrev: true, joinsNext: false, isolated: 'ﺃ', final: 'ﺄ' }, // أ
  'ؤ': { joinsPrev: true, joinsNext: false, isolated: 'ﺅ', final: 'ﺆ' }, // ؤ
  'إ': { joinsPrev: true, joinsNext: false, isolated: 'ﺇ', final: 'ﺈ' }, // إ
  'ئ': { joinsPrev: true, joinsNext: true, isolated: 'ﺉ', final: 'ﺊ', initial: 'ﺋ', medial: 'ﺌ' }, // ئ
  'ا': { joinsPrev: true, joinsNext: false, isolated: 'ﺍ', final: 'ﺎ' }, // ا
  'ب': { joinsPrev: true, joinsNext: true, isolated: 'ﺏ', final: 'ﺐ', initial: 'ﺑ', medial: 'ﺒ' }, // ب
  'ة': { joinsPrev: true, joinsNext: false, isolated: 'ﺓ', final: 'ﺔ' }, // ة
  'ت': { joinsPrev: true, joinsNext: true, isolated: 'ﺕ', final: 'ﺖ', initial: 'ﺗ', medial: 'ﺘ' }, // ت
  'ث': { joinsPrev: true, joinsNext: true, isolated: 'ﺙ', final: 'ﺚ', initial: 'ﺛ', medial: 'ﺜ' }, // ث
  'ج': { joinsPrev: true, joinsNext: true, isolated: 'ﺝ', final: 'ﺞ', initial: 'ﺟ', medial: 'ﺠ' }, // ج
  'ح': { joinsPrev: true, joinsNext: true, isolated: 'ﺡ', final: 'ﺢ', initial: 'ﺣ', medial: 'ﺤ' }, // ح
  'خ': { joinsPrev: true, joinsNext: true, isolated: 'ﺥ', final: 'ﺦ', initial: 'ﺧ', medial: 'ﺨ' }, // خ
  'د': { joinsPrev: true, joinsNext: false, isolated: 'ﺩ', final: 'ﺪ' }, // د
  'ذ': { joinsPrev: true, joinsNext: false, isolated: 'ﺫ', final: 'ﺬ' }, // ذ
  'ر': { joinsPrev: true, joinsNext: false, isolated: 'ﺭ', final: 'ﺮ' }, // ر
  'ز': { joinsPrev: true, joinsNext: false, isolated: 'ﺯ', final: 'ﺰ' }, // ز
  'س': { joinsPrev: true, joinsNext: true, isolated: 'ﺱ', final: 'ﺲ', initial: 'ﺳ', medial: 'ﺴ' }, // س
  'ش': { joinsPrev: true, joinsNext: true, isolated: 'ﺵ', final: 'ﺶ', initial: 'ﺷ', medial: 'ﺸ' }, // ش
  'ص': { joinsPrev: true, joinsNext: true, isolated: 'ﺹ', final: 'ﺺ', initial: 'ﺻ', medial: 'ﺼ' }, // ص
  'ض': { joinsPrev: true, joinsNext: true, isolated: 'ﺽ', final: 'ﺾ', initial: 'ﺿ', medial: 'ﻀ' }, // ض
  'ط': { joinsPrev: true, joinsNext: true, isolated: 'ﻁ', final: 'ﻂ', initial: 'ﻃ', medial: 'ﻄ' }, // ط
  'ظ': { joinsPrev: true, joinsNext: true, isolated: 'ﻅ', final: 'ﻆ', initial: 'ﻇ', medial: 'ﻈ' }, // ظ
  'ع': { joinsPrev: true, joinsNext: true, isolated: 'ﻉ', final: 'ﻊ', initial: 'ﻋ', medial: 'ﻌ' }, // ع
  'غ': { joinsPrev: true, joinsNext: true, isolated: 'ﻍ', final: 'ﻎ', initial: 'ﻏ', medial: 'ﻐ' }, // غ
  'ف': { joinsPrev: true, joinsNext: true, isolated: 'ﻑ', final: 'ﻒ', initial: 'ﻓ', medial: 'ﻔ' }, // ف
  'ق': { joinsPrev: true, joinsNext: true, isolated: 'ﻕ', final: 'ﻖ', initial: 'ﻗ', medial: 'ﻘ' }, // ق
  'ك': { joinsPrev: true, joinsNext: true, isolated: 'ﻙ', final: 'ﻚ', initial: 'ﻛ', medial: 'ﻜ' }, // ك
  'ل': { joinsPrev: true, joinsNext: true, isolated: 'ﻝ', final: 'ﻞ', initial: 'ﻟ', medial: 'ﻠ' }, // ل
  'م': { joinsPrev: true, joinsNext: true, isolated: 'ﻡ', final: 'ﻢ', initial: 'ﻣ', medial: 'ﻤ' }, // م
  'ن': { joinsPrev: true, joinsNext: true, isolated: 'ﻥ', final: 'ﻦ', initial: 'ﻧ', medial: 'ﻨ' }, // ن
  'ه': { joinsPrev: true, joinsNext: true, isolated: 'ﻩ', final: 'ﻪ', initial: 'ﻫ', medial: 'ﻬ' }, // ه
  'و': { joinsPrev: true, joinsNext: false, isolated: 'ﻭ', final: 'ﻮ' }, // و
  'ى': { joinsPrev: true, joinsNext: false, isolated: 'ﻯ', final: 'ﻰ' }, // ى
  'ي': { joinsPrev: true, joinsNext: true, isolated: 'ﻱ', final: 'ﻲ', initial: 'ﻳ', medial: 'ﻴ' }  // ي
};

function isArabicChar(ch) {
  var code = ch.codePointAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
    (code >= 0xFB50 && code <= 0xFDFF) ||
    (code >= 0xFE70 && code <= 0xFEFF);
}

// أقواس "محايدة" تُعكس بصريًا (mirroring) فقط عندما تقع داخل كلمة عربية (سياق RTL)،
// حتى تبدو فاتحة/مغلقة من الجهة الصحيحة بصريًا — طبقًا لخوارزمية Unicode Bidi.
var MIRROR_PAIRS = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{' };

/**
 * هل يحتوي النص على حرف عربي (وليس مجرد علامة ترقيم عربية كالفاصلة "،")؟
 * تُستخدم لتصنيف "كلمة" كعربية أم لا عند تقسيم النص إلى مقاطع — كلمة لاتينية
 * ملتصقة بعلامة ترقيم عربية بلا مسافة (مثل "PDF،") يجب ألا تُصنَّف عربية
 * وتُعكس حروفها اللاتينية خطأً (تتحول "PDF،" إلى "،FDP").
 */
function containsArabicLetter(text) {
  text = text || '';
  for (var i = 0; i < text.length; i++) {
    if (JOIN_TABLE[text[i]]) return true;
  }
  return false;
}

/**
 * هل يحتوي النص على أي حرف عربي؟
 */
App.ArabicText.containsArabic = function (text) {
  text = text || '';
  for (var i = 0; i < text.length; i++) {
    if (isArabicChar(text[i])) return true;
  }
  return false;
};

/**
 * تشكيل كلمة عربية واحدة (بدون مسافات داخلية): استبدال كل حرف بشكله الصحيح
 * (منفصل/بداية/وسط/نهاية) حسب الحروف المجاورة له، مع دمج رباط "لا" عند الحاجة.
 * تُعيد مصفوفة رموز بالترتيب المنطقي (كما كُتبت).
 */
function shapeWordLogical(word) {
  var chars = Array.from(word);
  var n = chars.length;
  var output = [];
  var i = 0;

  function joinsNext(idx) {
    if (idx < 0 || idx >= n) return false;
    var info = JOIN_TABLE[chars[idx]];
    return !!(info && info.joinsNext);
  }
  function joinsPrev(idx) {
    if (idx < 0 || idx >= n) return false;
    var info = JOIN_TABLE[chars[idx]];
    return !!(info && info.joinsPrev);
  }

  while (i < n) {
    var ch = chars[i];
    var info = JOIN_TABLE[ch];

    if (!info) {
      output.push(MIRROR_PAIRS[ch] || ch);
      i++;
      continue;
    }

    // رباط لام + ألف (لا / لأ / لإ / لآ)
    if (ch === LAM && i + 1 < n && LAM_ALEF_LIGATURES[chars[i + 1]]) {
      var ligature = LAM_ALEF_LIGATURES[chars[i + 1]];
      var prevConnectsLigature = joinsNext(i - 1) && info.joinsPrev;
      output.push(prevConnectsLigature ? ligature.final : ligature.isolated);
      i += 2;
      continue;
    }

    var prevConnects = joinsNext(i - 1) && info.joinsPrev;
    var nextConnects = info.joinsNext && joinsPrev(i + 1);

    var form;
    if (prevConnects && nextConnects) form = info.medial;
    else if (prevConnects && !nextConnects) form = info.final;
    else if (!prevConnects && nextConnects) form = info.initial;
    else form = info.isolated;

    output.push(form || info.isolated);
    i++;
  }

  return output;
}

/**
 * تحويل نص (قد يحتوي عربية وأرقام وكلمات لاتينية ورموز مثل €) إلى نص جاهز
 * لرسمه بواسطة jsPDF برسم عادي من اليسار لليمين، بحيث تظهر النتيجة صحيحة
 * بصريًا: الحروف العربية متصلة بالشكل الصحيح، والنص مرتّب من اليمين لليسار،
 * مع إبقاء الأرقام والكلمات الأجنبية (مثل "91,00 €" أو "Uber") بترتيبها الطبيعي.
 *
 * الأسلوب المستخدم: تقسيم النص إلى "كلمات" مفصولة بمسافات، ثم تجميع الكلمات
 * المتتالية التي لا تحتوي عربية (أرقام/كلمات لاتينية/رموز) في "مقطع" واحد محايد
 * الاتجاه (LTR run) — لأن عكس ترتيب هذه الكلمات فرديًا (كما كان يحدث سابقًا) كان
 * يكسر معنى نصوص مثل "17:00 -> 23:30" (تتحول إلى "23:30 -> 17:00" بمعنى معكوس!)
 * أو "(Kasse Bar)" (تتحول إلى "Bar) (Kasse"). كل كلمة عربية تُشكَّل ثم تُعكس حروفها
 * (ليُرسم بصريًا بشكل صحيح)، بينما يبقى كل مقطع لاتيني/رقمي كما هو دون لمسه، ثم
 * يُعاد ترتيب المقاطع (لا الكلمات المفردة) ككل. هذا أسلوب عملي مبسّط (وليس خوارزمية
 * Unicode BiDi الكاملة UAX#9) لكنه يعطي نتائج صحيحة للنصوص القصيرة من نوع
 * "تسمية: قيمة" والجمل العادية التي يستخدمها هذا التطبيق.
 */
function buildVisualRuns(text) {
  var words = text.split(' ');

  // تجميع الكلمات المتتالية غير العربية في مقطع واحد يحافظ على ترتيبه الداخلي
  var tokens = [];
  words.forEach(function (word) {
    var isArabicWord = word !== '' && containsArabicLetter(word);
    var last = tokens[tokens.length - 1];
    if (!isArabicWord && last && !last.isArabic) {
      last.text += ' ' + word;
    } else {
      tokens.push({ text: word, isArabic: isArabicWord });
    }
  });

  var visualRuns = tokens.map(function (token) {
    if (!token.isArabic) return { text: token.text, isArabic: false };
    var shapedLogical = shapeWordLogical(token.text);
    return { text: shapedLogical.slice().reverse().join(''), isArabic: true };
  });

  visualRuns.reverse();
  return visualRuns;
}

App.ArabicText.shapeForPdf = function (text) {
  text = text == null ? '' : String(text);
  if (!App.ArabicText.containsArabic(text)) return text;
  return buildVisualRuns(text).map(function (run) { return run.text; }).join(' ');
};

/**
 * مثل shapeForPdf، لكنها تُعيد قائمة "مقاطع" (run) بدل نص واحد مدمج — كل
 * مقطع يحمل نصه الجاهز للرسم مع علم isArabic. سبب الحاجة لهذا: الخط العربي
 * المُضمَّن (ArabicFont) لا يحتوي أشكال الحروف اللاتينية/الأرقام إطلاقًا
 * (والعكس صحيح لخط helvetica)، فأي نص عربي يحوي رقمًا أو كلمة إنجليزية
 * بداخله (مثل "...الساعة 17:00 -> 18:00") يجب أن يُرسم كمقاطع منفصلة، كل
 * مقطع بخطه الصحيح، لا كخط واحد يفرض نفسه على كامل النص (وإلا اختفت
 * الأحرف غير المدعومة من الخط بصمت).
 */
App.ArabicText.shapeRunsForPdf = function (text) {
  text = text == null ? '' : String(text);
  if (!App.ArabicText.containsArabic(text)) return [{ text: text, isArabic: false }];
  return buildVisualRuns(text);
};

window.App = App;
