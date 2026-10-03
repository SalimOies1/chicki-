// جميع النصوص الإنجليزية الثابتة الظاهرة في تقرير PDF — في مكان واحد.
//
// عدّل أي قيمة هنا (الجزء الذي بين علامتي الاقتباس ' ' بعد النقطتين :) لتغيير
// الكتابة الظاهرة في التقرير، دون الحاجة لفتح أو فهم ملف js/pdf.js نفسه.
// مثال: لتغيير "Drivers" إلى "Couriers" غيّر السطر إلى: driversSectionTitle: 'Couriers',
//
// ملاحظة مهمة: هذا الملف لا يحتوي على أي أسماء موظفين/سائقين ولا ملاحظات —
// تلك بيانات يُدخلها المستخدم من داخل التطبيق نفسه، وليست هنا.

var App = window.App || {};

App.PDFText = {
  // ===== العلامة التجارية ورأس الصفحة الأولى =====
  brandName: 'CHICKI THE KIKI',
  reportTitle: 'Daily Report',

  // ===== القسم 1: الإيرادات والحسابات =====
  revenueSectionTitle: 'برامج',
  totalRevenueLabel: 'الاجمالي',

  // اسم كل حقل إيراد كما يظهر بالتقرير — عدّل أي اسم هنا (مثلاً Uber أو Wolt)
  // دون التأثير على بقية التطبيق (هذه نسخة خاصة بالـ PDF فقط).
  // ملاحظة: حقل "rechnungen" غير مستخدم عمدًا — تم إخفاؤه من قائمة الإيرادات
  // والحسابات (له قسم فواتير مستقل أدناه).
  revenueLabels: {
    uber: 'Uber',
    wolt: 'Wolt',
    woltBar: 'Wolt Bar',
    daftar: 'Daftar',
    kasseBar: 'Kasse Bar',
    kasseKarte: 'Kasse Karte',
    lieferandoBar: 'Lieferando Bar',
    kartenSchliesser: 'Karte Faher'
  },

  // ===== القسم 2: الموظفون =====
  employeesSectionTitle: 'جوا',
  noEmployeesText: 'No employees.',
  employeeFallbackPrefix: 'Employee', // عند عدم كتابة اسم: "Employee 1"، "Employee 2"...

  // ===== القسم 3: السائقون =====
  driversSectionTitle: 'السائقين',
  noDriversText: 'No drivers.',
  driverFallbackPrefix: 'Driver', // عند عدم كتابة اسم: "Driver 1"، "Driver 2"...
  orderLabelPrefix: 'Order', // "Order 1"، "Order 2"...
  orderCountLabel: 'Order Count',
  totalBarCashOrdersLabel: 'Total Bar Cash Orders',
  orderPayLabel: 'Order Pay',
  totalDriverPayLabel: 'حساب الشوفير',
  settlementBalanced: 'Balanced',
  settlementDriverOwesRestaurant: 'الشوفر رجع',
  settlementRestaurantOwesDriver: 'الشوفير اخذ',

  // ===== صفوف مشتركة بين بطاقة الموظف وبطاقة السائق =====
  hoursWorkedLabel: 'Hours Worked',
  hourlyWageLabel: 'Hourly Wage',
  drinksLabel: 'Drinks',
  cashTakenLabel: 'Cash Taken',
  finalAmountLabel: 'Final Amount',

  // ===== القسم 4: الفواتير =====
  invoicesSectionTitle: 'فواتير',
  noInvoicesText: 'No invoices.',
  invoiceFallbackPrefix: 'Invoice', // عند عدم كتابة اسم: "Invoice 1"، "Invoice 2"...
  totalInvoicesLabel: 'Total Invoices',

  // ===== القسم 5: المشاكل والملاحظات =====
  notesSectionTitle: 'مشاكل & ملاحظات',
  noNotesText: 'No problems or notes.',

  // ===== القسم 6: تفاصيل طلبات السائقين (صفحة مستقلة بآخر التقرير) =====
  driverOrdersSectionTitle: 'Driver Orders',
  noDriverOrdersText: 'No driver orders.',

  // ===== اسم ملف PDF عند التنزيل =====
  filenamePrefix: 'Report-' // الناتج مثلاً: Report-30.09.2026.pdf
};

window.App = App;
