// وحدة الحسابات — كل منطق الحساب المحاسبي معزول هنا حتى يسهل تعديله لاحقًا

var App = window.App || {};

App.Calculations = {};

/**
 * تعريف حقول الإيرادات (المصدر الوحيد للحقيقة): المفتاح، التسمية العربية،
 * والمصطلح الألماني المقابل (إن وجد) الذي يُعرض أسفل التسمية.
 */
App.Calculations.REVENUE_FIELDS = [
  { key: 'uber', labelAr: 'أوبر', labelDe: 'Uber' },
  { key: 'wolt', labelAr: 'فولت', labelDe: 'wolt' },
  { key: 'woltBar', labelAr: 'فولت بار', labelDe: 'wolt bar' },
  { key: 'daftar', labelAr: 'دفتر', labelDe: null },
  { key: 'kasseBar', labelAr: 'كاسة بار', labelDe: 'Kasse Bar' },
  { key: 'kasseKarte', labelAr: 'كاسة كارت', labelDe: 'Kasse Karte' },
  { key: 'lieferandoBar', labelAr: 'ليفراندو بار', labelDe: 'Lieferando Bar' },
  { key: 'kartenSchliesser', labelAr: 'كارت شوفير', labelDe: 'karte faher' },
  { key: 'rechnungen', labelAr: 'فواتير', labelDe: 'Rechnungen' }
];

/**
 * إجمالي الإيرادات = مجموع كل حقول الإيرادات.
 */
App.Calculations.calculateRevenueTotal = function (revenue) {
  revenue = revenue || {};
  return App.Calculations.REVENUE_FIELDS.reduce(function (sum, field) {
    return sum + (Number(revenue[field.key]) || 0);
  }, 0);
};

/**
 * تحويل وقت بصيغة "HH:MM" إلى عدد الدقائق منذ منتصف الليل.
 * يُعاد null إذا كان الوقت غير محدد.
 */
App.Calculations.timeToMinutes = function (timeStr) {
  if (!timeStr) return null;
  var parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  var hours = Number(parts[0]);
  var minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/**
 * حساب عدد ساعات العمل بين وقت البدء والانتهاء.
 * إذا كان وقت الانتهاء أقل من أو يساوي وقت البدء، يُعتبر الشفت عابرًا لمنتصف الليل
 * ويُضاف 24 ساعة تلقائيًا (مثال: 18:00 → 01:00 = 7 ساعات).
 */
App.Calculations.calculateWorkHours = function (startTime, endTime) {
  var startMin = App.Calculations.timeToMinutes(startTime);
  var endMin = App.Calculations.timeToMinutes(endTime);
  if (startMin === null || endMin === null) return 0;

  var diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;

  return diff / 60;
};

/**
 * أجر الساعات = عدد الساعات × الأجر بالساعة
 */
App.Calculations.calculateHourlyPay = function (hours, hourlyWage) {
  return (Number(hours) || 0) * (Number(hourlyWage) || 0);
};

/**
 * تسوية حساب الموظف النهائية:
 * الحساب النهائي = أجر الساعات - المشروبات - المبلغ المسحوب
 * (معزولة هنا لتسهيل تعديل قاعدة الحساب لاحقًا إذا تغيّرت سياسة المطعم)
 */
App.Calculations.calculateEmployeeSettlement = function (employee) {
  employee = employee || {};
  var hours = App.Calculations.calculateWorkHours(employee.startTime, employee.endTime);
  var hourlyPay = App.Calculations.calculateHourlyPay(hours, employee.hourlyWage);
  var drinks = Number(employee.drinks) || 0;
  var cashTaken = Number(employee.cashTaken) || 0;
  var finalAmount = hourlyPay - drinks - cashTaken;

  return {
    hours: hours,
    hourlyPay: hourlyPay,
    drinks: drinks,
    cashTaken: cashTaken,
    finalAmount: finalAmount
  };
};

/**
 * إعدادات محاسبية قابلة للتعديل (ستُربط بشاشة الإعدادات في مرحلة لاحقة).
 * مصدر وحيد لقيمة أجر الطلب — لا تُكتب €1.30 في أي مكان آخر في الكود.
 */
App.Calculations.config = {
  driverOrderPayment: 1.30
};

/**
 * عدد ساعات عمل السائق (تُعيد استخدام نفس منطق حساب ساعات الموظفين).
 */
App.Calculations.calculateDriverHours = function (driver) {
  driver = driver || {};
  return App.Calculations.calculateWorkHours(driver.startTime, driver.endTime);
};

/**
 * أجر ساعات السائق = عدد الساعات × الأجر بالساعة
 */
App.Calculations.calculateDriverHourlyPay = function (driver) {
  var hours = App.Calculations.calculateDriverHours(driver);
  return App.Calculations.calculateHourlyPay(hours, driver.hourlyWage);
};

/**
 * إجمالي كاش طلبات البار = مجموع قيم كل الطلبات المُدخلة.
 * القيم غير المُدخلة (null) تُحتسب كصفر في المجموع (التحقق من نقصها منفصل في validation.js).
 */
App.Calculations.calculateBarOrdersTotal = function (orderAmounts) {
  orderAmounts = orderAmounts || [];
  return orderAmounts.reduce(function (sum, amount) {
    return sum + (Number(amount) || 0);
  }, 0);
};

/**
 * أجر الطلبات = عدد الطلبات × قيمة أجر الطلب الواحد (من الإعدادات).
 */
App.Calculations.calculateDriverOrderPay = function (orderCount) {
  return (Number(orderCount) || 0) * App.Calculations.config.driverOrderPayment;
};

/**
 * إجمالي حساب السائق = أجر الساعات + أجر الطلبات
 */
App.Calculations.calculateDriverTotalPay = function (driver) {
  var hourlyPay = App.Calculations.calculateDriverHourlyPay(driver);
  var orderPay = App.Calculations.calculateDriverOrderPay(driver.orderCount);
  return hourlyPay + orderPay;
};

/**
 * التسوية النقدية النهائية للسائق.
 *
 * قرار محاسبي معزول عمدًا في هذه الدالة: التسوية الحالية =
 *   إجمالي كاش طلبات البار − إجمالي حساب السائق
 * المشروبات والمبلغ المسحوب يُخزَّنان ويُعرضان بشكل منفصل وشفاف، لكنهما لا يدخلان
 * حاليًا في معادلة التسوية. إذا احتاج المطعم لاحقًا خصمهما من التسوية، يكفي تعديل
 * السطر الخاص بـ "difference" هنا فقط دون المساس بأي مكان آخر في التطبيق.
 */
App.Calculations.calculateDriverSettlement = function (driver) {
  driver = driver || {};
  var hours = App.Calculations.calculateDriverHours(driver);
  var hourlyPay = App.Calculations.calculateDriverHourlyPay(driver);
  var barTotal = App.Calculations.calculateBarOrdersTotal(driver.orderAmounts);
  var orderPay = App.Calculations.calculateDriverOrderPay(driver.orderCount);
  var totalPay = hourlyPay + orderPay;
  var drinks = Number(driver.drinks) || 0;
  var cashTaken = Number(driver.cashTaken) || 0;

  var difference = barTotal - totalPay;
  var direction = difference > 0 ? 'driver_gives' : (difference < 0 ? 'restaurant_gives' : 'even');

  return {
    hours: hours,
    hourlyPay: hourlyPay,
    orderCount: Number(driver.orderCount) || 0,
    orderAmounts: (driver.orderAmounts || []).slice(),
    barTotal: barTotal,
    orderPay: orderPay,
    totalPay: totalPay,
    drinks: drinks,
    cashTaken: cashTaken,
    difference: Math.abs(difference),
    direction: direction
  };
};

/**
 * إجمالي الفواتير = مجموع مبالغ كل الفواتير المُدخلة.
 */
App.Calculations.calculateInvoicesTotal = function (invoices) {
  invoices = invoices || [];
  return invoices.reduce(function (sum, invoice) {
    return sum + (Number(invoice.amount) || 0);
  }, 0);
};

window.App = App;
