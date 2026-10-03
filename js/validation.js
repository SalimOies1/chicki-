// وحدة التحقق من صحة البيانات واكتشاف الأخطاء

var App = window.App || {};

App.Validation = {};

/**
 * تحويل قيمة مُدخلة إلى رقم مبلغ صالح غير سالب.
 * أي قيمة غير رقمية أو سالبة تُعامل كصفر (لا تُقبل المبالغ السالبة).
 */
App.Validation.parseAmount = function (rawValue) {
  var num = parseFloat(rawValue);
  if (isNaN(num) || num < 0) return 0;
  return num;
};

/**
 * تحويل قيمة مُدخلة إلى رقم مبلغ صالح غير سالب، مع الحفاظ على "عدم الإدخال"
 * كحالة منفصلة (null) بدل تحويلها تلقائيًا إلى صفر. تُستخدم لقيم طلبات السائق
 * حتى يمكن اكتشاف الطلبات التي لم تُدخل قيمتها بعد (بخلاف parseAmount).
 */
App.Validation.parseAmountOrNull = function (rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
  var num = parseFloat(rawValue);
  if (isNaN(num) || num < 0) return null;
  return num;
};

/**
 * التحقق من بيانات سائق واحد. تُعيد مصفوفة رسائل تحذير بالعربية
 * (مصفوفة فارغة تعني عدم وجود مشاكل).
 */
App.Validation.validateDriver = function (driver) {
  driver = driver || {};
  var issues = [];

  if (!driver.name || !driver.name.trim()) {
    issues.push('يرجى إدخال اسم السائق.');
  }

  if (!driver.hourlyWage || Number(driver.hourlyWage) <= 0) {
    issues.push('يرجى إدخال أجر الساعة.');
  }

  if (!driver.startTime || !driver.endTime) {
    issues.push('يرجى إدخال وقت البدء والانتهاء.');
  }

  var orderCount = Number(driver.orderCount) || 0;
  var amounts = driver.orderAmounts || [];
  var missingNumbers = [];
  for (var i = 0; i < orderCount; i++) {
    if (amounts[i] === null || amounts[i] === undefined) {
      missingNumbers.push(i + 1);
    }
  }

  if (missingNumbers.length > 0) {
    var enteredCount = orderCount - missingNumbers.length;
    issues.push(
      'لديك ' + orderCount + ' طلبات ولكن تم إدخال قيمة ' + enteredCount + ' طلبات فقط. ' +
      'يرجى إدخال قيمة الطلب رقم ' + missingNumbers.join('، رقم ') + '.'
    );
  }

  return issues;
};

/**
 * التحقق من بيانات موظف واحد.
 */
App.Validation.validateEmployee = function (employee) {
  employee = employee || {};
  var issues = [];

  if (!employee.name || !employee.name.trim()) {
    issues.push('يرجى إدخال اسم الموظف.');
  }

  if (!employee.hourlyWage || Number(employee.hourlyWage) <= 0) {
    issues.push('يرجى إدخال أجر الساعة.');
  }

  if (!employee.startTime || !employee.endTime) {
    issues.push('يرجى إدخال وقت العمل (البدء والانتهاء).');
  }

  return issues;
};

/**
 * التحقق من بيانات فاتورة واحدة.
 */
App.Validation.validateInvoice = function (invoice) {
  invoice = invoice || {};
  var issues = [];

  if (!invoice.name || !invoice.name.trim()) {
    issues.push('يرجى إدخال وصف الفاتورة.');
  }

  if (!invoice.amount || Number(invoice.amount) <= 0) {
    issues.push('يرجى إدخال مبلغ الفاتورة.');
  }

  return issues;
};

/**
 * التحقق من قسم الإيرادات ككل. لا توجد حقول "مطلوبة" بمعنى صارم (صفر قيمة مقبولة
 * لأي قناة بيع)، لكن نُنبّه إذا لم يُدخل أي مبلغ في أي حقل إطلاقًا.
 */
App.Validation.validateRevenue = function (revenue) {
  var issues = [];
  var total = App.Calculations.calculateRevenueTotal(revenue);
  if (total <= 0) {
    issues.push('لم يتم إدخال أي إيرادات بعد.');
  }
  return issues;
};

/**
 * التحقق الشامل من كل بيانات الإغلاق اليومي قبل إنشاء التقرير.
 * تُعيد قائمة أقسام، كل قسم يحتوي على: المعرّف، رقم الخطوة المقابلة،
 * العنوان، وقائمة عناصر المشاكل (فارغة = القسم سليم)، بالإضافة إلى isValid الكلي.
 */
App.Validation.validateClosing = function (data) {
  data = data || {};

  function issuesForList(list, validateItemFn, labelPrefix) {
    var result = [];
    (list || []).forEach(function (item, index) {
      var issues = validateItemFn(item);
      if (issues.length === 0) return;
      var label = labelPrefix + ' ' + (index + 1) + (item.name && item.name.trim() ? ' - ' + item.name.trim() : '');
      issues.forEach(function (issue) {
        result.push({ message: label + ': ' + issue, targetId: item.id });
      });
    });
    return result;
  }

  var sections = [
    {
      id: 'revenue',
      stepIndex: 0,
      label: 'الإيرادات',
      items: App.Validation.validateRevenue(data.revenue).map(function (msg) {
        return { message: msg };
      })
    },
    {
      id: 'employees',
      stepIndex: 1,
      label: 'الموظفون',
      items: issuesForList(data.employees, App.Validation.validateEmployee, 'الموظف')
    },
    {
      id: 'drivers',
      stepIndex: 2,
      label: 'السائقون',
      items: issuesForList(data.drivers, App.Validation.validateDriver, 'السائق')
    },
    {
      id: 'invoices',
      stepIndex: 3,
      label: 'الفواتير',
      items: issuesForList(data.invoices, App.Validation.validateInvoice, 'الفاتورة')
    },
    {
      id: 'notes',
      stepIndex: 4,
      label: 'المشاكل والملاحظات',
      items: []
    }
  ];

  sections.forEach(function (section) {
    section.ok = section.items.length === 0;
  });

  var isValid = sections.every(function (section) {
    return section.ok;
  });

  return { sections: sections, isValid: isValid };
};

window.App = App;
