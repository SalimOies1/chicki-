// وحدة واجهة المستخدم — مكوّنات وأدوات عرض مشتركة تُستخدم في جميع الشاشات

var App = window.App || {};

App.UI = {};

/**
 * تنسيق مبلغ مالي بالصيغة الألمانية: 1.234,56 €
 * (فاصلة للكسور العشرية، نقطة لفواصل الآلاف، رمز اليورو بعد الرقم)
 */
App.UI.formatCurrency = function (amount) {
  var value = Number(amount) || 0;
  var formatted = value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatted + ' €';
};

/**
 * تنسيق تاريخ للعرض بالصيغة: 30.09.2026
 */
App.UI.formatDateDisplay = function (date) {
  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var year = date.getFullYear();
  return day + '.' + month + '.' + year;
};

/**
 * اسم اليوم بالعربية (مثال: الأربعاء)
 */
App.UI.formatWeekday = function (date) {
  return new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(date);
};

/**
 * تحويل كائن Date إلى صيغة ISO (yyyy-mm-dd) لاستخدامه في input[type=date]
 */
App.UI.toISODate = function (date) {
  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
};

/**
 * تنسيق عدد الساعات للعرض بالصيغة الألمانية: 6,5 ساعة
 */
App.UI.formatHours = function (hours) {
  var value = Number(hours) || 0;
  var formatted = value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return formatted + ' ساعة';
};

/**
 * إنشاء عنصر DOM بسهولة دون استخدام innerHTML.
 * attrs: خصائص/سمات العنصر. المفاتيح الخاصة:
 *   class -> className, text -> textContent, onXxx -> addEventListener
 * children: عنصر واحد، نص، أو مصفوفة منهما.
 */
App.UI.el = function (tag, attrs, children) {
  var node = document.createElement(tag);
  attrs = attrs || {};

  Object.keys(attrs).forEach(function (key) {
    var value = attrs[key];
    if (value === undefined || value === null || value === false) return;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key.indexOf('on') === 0 && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node) {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  });

  if (children !== undefined && children !== null) {
    var list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child === undefined || child === null || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(child));
      } else {
        node.appendChild(child);
      }
    });
  }

  return node;
};

/**
 * تفعيل شريط التنقل السفلي: تبديل الحالة النشطة عند الضغط.
 * التنقل الفعلي بين الشاشات سيُبنى في مرحلة لاحقة.
 */
App.UI.initBottomNav = function () {
  var nav = document.getElementById('bottom-nav');
  if (!nav) return;

  var items = nav.querySelectorAll('.bottom-nav__item');
  items.forEach(function (item) {
    item.addEventListener('click', function () {
      items.forEach(function (i) {
        i.classList.remove('bottom-nav__item--active');
      });
      item.classList.add('bottom-nav__item--active');
    });
  });
};

window.App = App;
