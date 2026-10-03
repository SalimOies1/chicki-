// Daily PDF report generator — "Chicki the Kiki" brand identity.
//
// Uses the same calculation functions from calculations.js exactly (no
// accounting logic is duplicated here) so a number in the PDF can never
// differ from the number shown on screen. This file is presentation only —
// it never changes or redefines any accounting formula.
//
// The report's own labels/template text are all English. Employee/driver
// names, invoice names and free-form notes are user data (often Arabic,
// since the app's data-entry UI is Arabic) — those are rendered as entered
// via App.ArabicText.shapeForPdf, which auto-detects Arabic and shapes/
// reorders it correctly for jsPDF (which does not do Arabic shaping or
// bidi reordering on its own).

var App = window.App || {};

App.PDF = {};

(function () {
  'use strict';

  // =========================================================
  // Colors & dimensions — restaurant identity (dark + gold/orange accents)
  // =========================================================

  var COLORS = {
    bg: [12, 10, 9],
    card: [24, 20, 15],
    border: [161, 115, 30],
    gold: [245, 197, 24],
    goldSoft: [214, 168, 46],
    orange: [249, 115, 22],
    white: [244, 244, 245],
    muted: [163, 156, 148],
    mutedSoft: [120, 113, 105],
    success: [52, 199, 107],
    danger: [239, 68, 68],
    darkOnGold: [26, 18, 4]
  };

  var PAGE_MARGIN = 36;
  var CARD_PAD = 13;
  var ROW_H = 15.5;
  var GAP_XS = 5;
  var GAP_SM = 10;
  var GAP_MD = 18;
  var FOOTER_H = 34;
  var RADIUS = 9;

  // Small colored monogram badges for each revenue field — a distinct
  // letter/color per service so rows are easy to scan, without imitating
  // any real third-party brand's actual logo.
  var REVENUE_ICONS = {
    uber: { bg: [17, 17, 17], letter: 'U' },
    wolt: { bg: [0, 194, 209], letter: 'W' },
    woltBar: { bg: [124, 58, 237], letter: 'W' },
    daftar: { bg: [22, 163, 74], letter: 'D' },
    kasseBar: { bg: [219, 39, 119], letter: 'B' },
    kasseKarte: { bg: [71, 85, 105], letter: 'K' },
    lieferandoBar: { bg: [249, 115, 22], letter: 'L' },
    kartenSchliesser: { bg: [29, 78, 216], letter: 'F' },
    rechnungen: { bg: [180, 130, 20], letter: 'R' }
  };

  // =========================================================
  // Document/page-level utilities
  // =========================================================

  function createDoc() {
    var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', putOnlyUsedFonts: true });

    doc.addFileToVFS('ArabicFont-Regular.ttf', window.ARABIC_FONT_REGULAR_BASE64);
    doc.addFont('ArabicFont-Regular.ttf', 'ArabicFont', 'normal');
    doc.addFileToVFS('ArabicFont-Bold.ttf', window.ARABIC_FONT_BOLD_BASE64);
    doc.addFont('ArabicFont-Bold.ttf', 'ArabicFont', 'bold');
    doc.setFont('ArabicFont', 'normal');

    return doc;
  }

  function makeLayout(doc) {
    return {
      pageWidth: doc.internal.pageSize.getWidth(),
      pageHeight: doc.internal.pageSize.getHeight(),
      marginLeft: PAGE_MARGIN,
      marginRight: PAGE_MARGIN,
      marginTop: PAGE_MARGIN,
      marginBottom: PAGE_MARGIN + FOOTER_H
    };
  }

  function fillPageBackground(doc, layout) {
    doc.setFillColor(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
    doc.rect(0, 0, layout.pageWidth, layout.pageHeight, 'F');
  }

  function newPage(doc, layout) {
    doc.addPage();
    fillPageBackground(doc, layout);
    return layout.marginTop;
  }

  function ensureSpace(doc, layout, y, needed) {
    if (y + needed > layout.pageHeight - layout.marginBottom) {
      return newPage(doc, layout);
    }
    return y;
  }

  // Arabic weekday name for the PDF header (fixed list, so the result never
  // depends on the browser's Intl locale support).
  var WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function formatWeekdayAr(date) {
    return WEEKDAYS_AR[date.getDay()];
  }

  // =========================================================
  // Text (auto Arabic shaping for user data + left/right/center alignment)
  // =========================================================

  // opts: size, bold, color, font ('helvetica' default, 'ArabicFont' for
  // Arabic data such as names/notes), arabic (force shaping on/off;
  // auto-detected from the text otherwise).
  //
  // The embedded Arabic font has no Latin/digit glyphs at all (and
  // helvetica has no Arabic glyphs), so a string that mixes both scripts
  // — e.g. a note containing "...الساعة 17:00 -> 18:00" — cannot be drawn
  // as a single doc.text() call in one font: whichever font doesn't cover
  // part of the string would silently draw nothing. Unless opts.font pins
  // a single font explicitly, auto-detected Arabic text is split into
  // per-script runs and each run is measured/drawn in its own font.
  // IMPORTANT: jsPDF 2.x ships a built-in BiDi engine that runs on EVERY
  // doc.text() call and, by default, treats the input as "visual" order and
  // converts it back to logical order — i.e. it reverses RTL text. Because
  // App.ArabicText already shapes + reorders the text into final visual
  // order, letting jsPDF reorder it again flips Arabic back to front.
  // Declaring both input and output as visual makes jsPDF's engine a no-op.
  var NO_BIDI = { isInputVisual: true, isOutputVisual: true };

  function T(doc, text, x, y, align, opts) {
    opts = opts || {};
    text = text == null ? '' : String(text);
    align = align || 'left';
    var size = opts.size || 10;
    var style = opts.bold ? 'bold' : 'normal';
    var c = opts.color || COLORS.white;

    var isArabic = opts.arabic;
    if (isArabic === undefined) isArabic = App.ArabicText.containsArabic(text);

    if (opts.font || !isArabic) {
      var font = opts.font || 'helvetica';
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(c[0], c[1], c[2]);
      var drawText = isArabic ? App.ArabicText.shapeForPdf(text) : text;
      doc.text(drawText, x, y, Object.assign({ align: align }, NO_BIDI));
      return;
    }

    var runs = App.ArabicText.shapeRunsForPdf(text);
    doc.setFontSize(size);
    doc.setTextColor(c[0], c[1], c[2]);

    function runFont(run) { return run.isArabic ? 'ArabicFont' : 'helvetica'; }
    function runAdvance(run, isLast) {
      doc.setFont(runFont(run), style);
      var w = doc.getStringUnitWidth(run.text, { fontSize: size }) * size;
      return isLast ? w : w + doc.getStringUnitWidth(' ', { fontSize: size }) * size;
    }

    var totalWidth = 0;
    runs.forEach(function (run, i) { totalWidth += runAdvance(run, i === runs.length - 1); });

    var cx = x;
    if (align === 'right') cx = x - totalWidth;
    else if (align === 'center') cx = x - totalWidth / 2;

    runs.forEach(function (run, i) {
      doc.setFont(runFont(run), style);
      doc.text(run.text, cx, y, Object.assign({ align: 'left' }, NO_BIDI));
      cx += runAdvance(run, i === runs.length - 1);
    });
  }

  // "Label: value" row — label on the left (muted), value on the right
  // (bold), matching normal English reading order.
  function row(doc, layout, y, label, value, opts) {
    opts = opts || {};
    var left = layout.marginLeft + CARD_PAD;
    var right = layout.pageWidth - layout.marginRight - CARD_PAD;
    T(doc, label, left, y, 'left', Object.assign({ size: 9.5, color: COLORS.muted }, opts.labelOpts));
    T(doc, value, right, y, 'right', Object.assign({ size: 9.5, bold: true, color: COLORS.white }, opts.valueOpts));
    return y + ROW_H;
  }

  // =========================================================
  // Simple shapes/icons
  // =========================================================

  function card(doc, x, y, w, h, opts) {
    opts = opts || {};
    var fill = opts.fill || COLORS.card;
    var border = opts.border || COLORS.border;
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(opts.lineWidth || 1);
    doc.roundedRect(x, y, w, h, opts.radius || RADIUS, opts.radius || RADIUS, opts.style || 'FD');
  }

  function circleClippedImage(doc, cx, cy, r, base64, format) {
    doc.saveGraphicsState();
    doc.ellipse(cx, cy, r, r, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(base64, format, cx - r, cy - r, r * 2, r * 2);
    doc.restoreGraphicsState();
    doc.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.setLineWidth(1.4);
    doc.circle(cx, cy, r, 'S');
  }

  function monogramBadge(doc, x, y, size, bg, letter) {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(x, y, size, size, 3.5, 3.5, 'F');
    T(doc, letter, x + size / 2, y + size / 2 + size * 0.17, 'center', {
      font: 'helvetica', bold: true, size: size * 0.52, color: COLORS.white, arabic: false
    });
  }

  function numberBadge(doc, cx, cy, r, number) {
    doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.circle(cx, cy, r, 'F');
    T(doc, String(number), cx, cy + r * 0.36, 'center', {
      font: 'helvetica', bold: true, size: r * 1.15, color: COLORS.darkOnGold, arabic: false
    });
  }

  function dot(doc, cx, cy, r, color) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(cx, cy, r, 'F');
  }

  function calendarIcon(doc, x, y, size, color) {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1.1);
    doc.roundedRect(x, y + size * 0.15, size, size * 0.8, 1.5, 1.5, 'S');
    doc.line(x, y + size * 0.42, x + size, y + size * 0.42);
    doc.setLineWidth(1.4);
    doc.line(x + size * 0.28, y, x + size * 0.28, y + size * 0.3);
    doc.line(x + size * 0.72, y, x + size * 0.72, y + size * 0.3);
  }

  function divider(doc, layout, y, opts) {
    opts = opts || {};
    var x1 = layout.marginLeft + CARD_PAD;
    var x2 = layout.pageWidth - layout.marginRight - CARD_PAD;
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(opts.width || 0.6);
    doc.line(x1, y, x2, y);
  }

  // =========================================================
  // Section header (number badge + title) — badge on the left, title text
  // reading left-to-right after it.
  // =========================================================

  var SECTION_HEADER_H = 6 /* top gap */ + 20 /* title line */ + GAP_MD /* gap before content */;

  function sectionHeader(doc, layout, y, number, title, opts) {
    opts = opts || {};
    // Reserve the header's own space together with its first content block
    // so the title is never left stranded alone at the bottom of a page
    // while all its content jumps to the next one.
    y = ensureSpace(doc, layout, y, SECTION_HEADER_H + (opts.reserve || 0));
    y += 6;
    var badgeR = 13;
    var badgeCx = layout.marginLeft + badgeR;
    var badgeCy = y + 4;
    numberBadge(doc, badgeCx, badgeCy, badgeR, number);

    // Title text is not forced to a fixed language/font — it comes from
    // the editable App.PDFText file, so it auto-detects Arabic vs Latin
    // and shapes/fonts itself accordingly either way.
    var textLeft = badgeCx + badgeR + 10;
    T(doc, title, textLeft, y, 'left', { size: 14.5, bold: true, color: COLORS.white });
    y += 20;
    divider(doc, layout, y, { width: 1 });
    y += GAP_MD;
    return y;
  }

  // =========================================================
  // Driver settlement — label/color taken verbatim from the calculation
  // result (direction/difference), never recomputed here.
  // =========================================================

  function settlementInfo(result) {
    var isDriverGives = result.direction === 'driver_gives';
    var isEven = result.direction === 'even';
    return {
      label: isEven ? App.PDFText.settlementBalanced : (isDriverGives ? App.PDFText.settlementDriverOwesRestaurant : App.PDFText.settlementRestaurantOwesDriver),
      color: isEven ? COLORS.muted : (isDriverGives ? COLORS.success : COLORS.danger)
    };
  }

  // =========================================================
  // Header (first page only)
  // =========================================================

  function drawHeader(doc, layout, date, y) {
    var cx = layout.pageWidth / 2;
    var logoR = 42;

    if (window.LOGO_BASE64) {
      circleClippedImage(doc, cx, y + logoR, logoR, window.LOGO_BASE64, window.LOGO_FORMAT || 'JPEG');
    }
    y += logoR * 2 + 16;

    T(doc, App.PDFText.brandName, cx, y, 'center', { bold: true, size: 21, color: COLORS.gold });
    y += 26;

    T(doc, App.PDFText.reportTitle, cx, y, 'center', { bold: true, size: 16.5, color: COLORS.white });
    y += 24;

    var dateStr = App.UI.formatDateDisplay(date);
    var weekday = formatWeekdayAr(date);
    var pillW = 240;
    var pillH = 26;
    var pillX = cx - pillW / 2;
    card(doc, pillX, y, pillW, pillH, { radius: 13 });
    calendarIcon(doc, pillX + 16, y + 7, 12, COLORS.gold);
    T(doc, dateStr, pillX + 36, y + pillH / 2 + 3.5, 'left', { font: 'helvetica', bold: true, size: 11, color: COLORS.white, arabic: false });
    T(doc, weekday, pillX + pillW - 16, y + pillH / 2 + 3.5, 'right', { bold: true, size: 11, color: COLORS.goldSoft });
    y += pillH + 22;

    return y;
  }

  // =========================================================
  // 1. Revenue & Accounts
  // =========================================================

  function drawRevenueSection(doc, layout, revenue, y) {
    y = sectionHeader(doc, layout, y, 1, App.PDFText.revenueSectionTitle);

    // "Rechnungen"/invoices is intentionally left out of this itemized list
    // (it has its own dedicated Invoices section) — the total below still
    // includes it, since it comes straight from calculateRevenueTotal().
    var fields = App.Calculations.REVENUE_FIELDS.filter(function (field) {
      return field.key !== 'rechnungen';
    });
    var rowH = 22;
    var cardH = CARD_PAD * 2 + fields.length * rowH;
    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;

    y = ensureSpace(doc, layout, y, cardH + 40);
    card(doc, cardX, y, cardW, cardH);

    var rowY = y + CARD_PAD + 14;
    fields.forEach(function (field) {
      var icon = REVENUE_ICONS[field.key] || { bg: COLORS.mutedSoft, letter: '•' };
      var iconX = cardX + CARD_PAD;
      var iconSize = 15;
      monogramBadge(doc, iconX, rowY - iconSize * 0.72, iconSize, icon.bg, icon.letter);

      var mainLabel = App.PDFText.revenueLabels[field.key] || field.key;
      T(doc, mainLabel, iconX + iconSize + 8, rowY, 'left', { size: 10.5, color: COLORS.white });

      var amount = App.UI.formatCurrency(revenue[field.key]);
      T(doc, amount, cardX + cardW - CARD_PAD, rowY, 'right', { font: 'helvetica', bold: true, size: 10.5, color: COLORS.white, arabic: false });

      rowY += rowH;
    });

    y += cardH + GAP_SM;

    var total = App.Calculations.calculateRevenueTotal(revenue);
    var totalH = 40;
    y = ensureSpace(doc, layout, y, totalH + 20);
    doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.roundedRect(cardX, y, cardW, totalH, RADIUS, RADIUS, 'F');
    T(doc, App.PDFText.totalRevenueLabel, cardX + CARD_PAD, y + totalH / 2 + 4, 'left', {
      bold: true, size: 12.5, color: COLORS.darkOnGold
    });
    T(doc, App.UI.formatCurrency(total), cardX + cardW - CARD_PAD, y + totalH / 2 + 4, 'right', {
      font: 'helvetica', bold: true, size: 15, color: COLORS.darkOnGold, arabic: false
    });
    y += totalH + GAP_MD;

    return y;
  }

  // =========================================================
  // 2. Employees
  // =========================================================

  function employeeCardHeight(rowCount) {
    return CARD_PAD * 2 + 20 + rowCount * ROW_H + GAP_XS + 26;
  }

  function drawEmployeeCard(doc, layout, employee, index, y) {
    var result = App.Calculations.calculateEmployeeSettlement(employee);
    var name = employee.name && employee.name.trim() ? employee.name.trim() : App.PDFText.employeeFallbackPrefix + ' ' + (index + 1);
    var timeLabel = (employee.startTime || '--:--') + ' -> ' + (employee.endTime || '--:--');

    var rowCount = 4;
    var cardH = employeeCardHeight(rowCount);
    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;

    y = ensureSpace(doc, layout, y, cardH);
    card(doc, cardX, y, cardW, cardH);

    var right = cardX + cardW - CARD_PAD;
    var left = cardX + CARD_PAD;
    var cy = y + CARD_PAD + 10;
    T(doc, name, left, cy, 'left', { bold: true, size: 12.5, color: COLORS.gold });
    T(doc, timeLabel, right, cy, 'right', { font: 'helvetica', size: 9.5, color: COLORS.muted, arabic: false });
    cy += 20;

    cy = row(doc, layout, cy, App.PDFText.hoursWorkedLabel, App.UI.formatHours(result.hours));
    cy = row(doc, layout, cy, App.PDFText.hourlyWageLabel, App.UI.formatCurrency(employee.hourlyWage));
    cy = row(doc, layout, cy, App.PDFText.drinksLabel, '-' + App.UI.formatCurrency(result.drinks));
    cy = row(doc, layout, cy, App.PDFText.cashTakenLabel, '-' + App.UI.formatCurrency(result.cashTaken));
    cy += GAP_XS;

    var barH = 26;
    var barMargin = 8;
    var barColor = result.finalAmount >= 0 ? COLORS.success : COLORS.danger;
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(cardX + barMargin, cy, cardW - barMargin * 2, barH, 6, 6, 'F');
    T(doc, App.PDFText.finalAmountLabel, left + 10, cy + barH / 2 + 4, 'left', { bold: true, size: 11, color: COLORS.darkOnGold });
    T(doc, App.UI.formatCurrency(result.finalAmount), right - 10, cy + barH / 2 + 4, 'right', {
      font: 'helvetica', bold: true, size: 12, color: COLORS.darkOnGold, arabic: false
    });

    return y + cardH + GAP_SM;
  }

  function drawEmployeesSection(doc, layout, employees, y) {
    var reserve = employees.length > 0 ? employeeCardHeight(4) : 0;
    y = sectionHeader(doc, layout, y, 2, App.PDFText.employeesSectionTitle, { reserve: reserve });

    if (employees.length === 0) {
      T(doc, App.PDFText.noEmployeesText, layout.marginLeft, y, 'left', { size: 10, color: COLORS.muted });
      return y + ROW_H + GAP_MD;
    }

    employees.forEach(function (employee, index) {
      y = drawEmployeeCard(doc, layout, employee, index, y);
    });

    return y + GAP_XS;
  }

  // =========================================================
  // 3. Drivers (+ prominent settlement bar)
  // =========================================================

  function driverCardHeight() {
    var fixedRows = 3 /* hours, wage, orderCount */ + 3 /* barTotal, orderPay, totalPay */ + 2 /* drinks, cashTaken */;
    return CARD_PAD * 2 + 20 + fixedRows * ROW_H + GAP_XS + 10 /* divider gap */ + 3 * ROW_H + GAP_XS + 30 /* settlement highlight bar */;
  }

  function drawDriverCard(doc, layout, driver, index, y) {
    var result = App.Calculations.calculateDriverSettlement(driver);
    var name = driver.name && driver.name.trim() ? driver.name.trim() : App.PDFText.driverFallbackPrefix + ' ' + (index + 1);
    var timeLabel = (driver.startTime || '--:--') + ' -> ' + (driver.endTime || '--:--');

    var cardH = driverCardHeight();
    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;

    y = ensureSpace(doc, layout, y, cardH);
    card(doc, cardX, y, cardW, cardH);

    var right = cardX + cardW - CARD_PAD;
    var left = cardX + CARD_PAD;
    var cy = y + CARD_PAD + 10;
    T(doc, name, left, cy, 'left', { bold: true, size: 12.5, color: COLORS.gold });
    T(doc, timeLabel, right, cy, 'right', { font: 'helvetica', size: 9.5, color: COLORS.muted, arabic: false });
    cy += 20;

    cy = row(doc, layout, cy, App.PDFText.hoursWorkedLabel, App.UI.formatHours(result.hours));
    cy = row(doc, layout, cy, App.PDFText.hourlyWageLabel, App.UI.formatCurrency(driver.hourlyWage));
    // Individual order amounts are not listed here (a driver can have 20-30
    // orders, which would bloat this card) — they get their own dedicated
    // section/page further down the report, grouped by driver name.
    cy = row(doc, layout, cy, App.PDFText.orderCountLabel, String(result.orderCount));

    cy = row(doc, layout, cy, App.PDFText.totalBarCashOrdersLabel, App.UI.formatCurrency(result.barTotal), { valueOpts: { color: COLORS.gold } });
    cy = row(doc, layout, cy, App.PDFText.orderPayLabel,
      result.orderCount + ' x ' + App.UI.formatCurrency(App.Calculations.config.driverOrderPayment) + ' = ' + App.UI.formatCurrency(result.orderPay));
    cy = row(doc, layout, cy, App.PDFText.totalDriverPayLabel, App.UI.formatCurrency(result.totalPay), { valueOpts: { color: COLORS.gold } });
    cy += GAP_XS;
    divider(doc, layout, cy);
    cy += 10;

    cy = row(doc, layout, cy, App.PDFText.drinksLabel, App.UI.formatCurrency(result.drinks));
    cy = row(doc, layout, cy, App.PDFText.cashTakenLabel, App.UI.formatCurrency(result.cashTaken));
    cy += GAP_XS;

    var settlement = settlementInfo(result);
    var barH = 30;
    doc.setFillColor(settlement.color[0], settlement.color[1], settlement.color[2]);
    doc.roundedRect(left, cy, cardW - CARD_PAD * 2, barH, 7, 7, 'F');
    dot(doc, left + 10, cy + barH / 2, 4, COLORS.darkOnGold);
    T(doc, settlement.label, left + 20, cy + barH / 2 + 4.5, 'left', { bold: true, size: 12, color: COLORS.darkOnGold });
    T(doc, App.UI.formatCurrency(result.difference), right - 10, cy + barH / 2 + 4.5, 'right', {
      font: 'helvetica', bold: true, size: 13, color: COLORS.darkOnGold, arabic: false
    });

    return y + cardH + GAP_SM;
  }

  function drawDriversSection(doc, layout, drivers, y) {
    var reserve = drivers.length > 0 ? driverCardHeight() : 0;
    y = sectionHeader(doc, layout, y, 3, App.PDFText.driversSectionTitle, { reserve: reserve });

    if (drivers.length === 0) {
      T(doc, App.PDFText.noDriversText, layout.marginLeft, y, 'left', { size: 10, color: COLORS.muted });
      return y + ROW_H + GAP_MD;
    }

    drivers.forEach(function (driver, index) {
      y = drawDriverCard(doc, layout, driver, index, y);
    });

    return y + GAP_XS;
  }

  // =========================================================
  // 4. Invoices
  // =========================================================

  function drawInvoicesSection(doc, layout, invoices, y) {
    var emptyH = 44;
    var cardH = CARD_PAD * 2 + invoices.length * ROW_H;
    var reserve = invoices.length > 0 ? cardH : emptyH;
    y = sectionHeader(doc, layout, y, 4, App.PDFText.invoicesSectionTitle, { reserve: reserve });

    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;

    if (invoices.length === 0) {
      y = ensureSpace(doc, layout, y, emptyH);
      card(doc, cardX, y, cardW, emptyH);
      T(doc, App.PDFText.noInvoicesText, layout.pageWidth / 2, y + emptyH / 2 + 4, 'center', { size: 10.5, color: COLORS.muted });
      return y + emptyH + GAP_MD;
    }

    y = ensureSpace(doc, layout, y, cardH);
    card(doc, cardX, y, cardW, cardH);

    var cy = y + CARD_PAD + 10;
    invoices.forEach(function (invoice, index) {
      var label = invoice.name && invoice.name.trim() ? invoice.name.trim() : App.PDFText.invoiceFallbackPrefix + ' ' + (index + 1);
      cy = row(doc, layout, cy, label, App.UI.formatCurrency(invoice.amount));
    });
    y += cardH + GAP_SM;

    var total = App.Calculations.calculateInvoicesTotal(invoices);
    var totalH = 34;
    y = ensureSpace(doc, layout, y, totalH + 20);
    doc.setFillColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
    doc.roundedRect(cardX, y, cardW, totalH, RADIUS, RADIUS, 'F');
    T(doc, App.PDFText.totalInvoicesLabel, cardX + CARD_PAD, y + totalH / 2 + 4, 'left', { bold: true, size: 11.5, color: COLORS.darkOnGold });
    T(doc, App.UI.formatCurrency(total), cardX + cardW - CARD_PAD, y + totalH / 2 + 4, 'right', {
      font: 'helvetica', bold: true, size: 12.5, color: COLORS.darkOnGold, arabic: false
    });
    y += totalH + GAP_MD;

    return y;
  }

  // =========================================================
  // 5. Problems & Notes
  // =========================================================

  function drawNotesSection(doc, layout, notes, y) {
    var trimmed = (notes || '').trim();
    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;
    var emptyH = 44;

    var maxWidth = cardW - CARD_PAD * 2;
    var cardH = emptyH;
    var paragraphs = [];
    if (trimmed) {
      doc.setFont('ArabicFont', 'normal');
      doc.setFontSize(10.5);
      paragraphs = trimmed.split('\n');
      var lineCount = 0;
      paragraphs.forEach(function (paragraph) {
        if (paragraph.trim() === '') { lineCount += 1; return; }
        lineCount += doc.splitTextToSize(paragraph, maxWidth).length;
      });
      cardH = CARD_PAD * 2 + lineCount * ROW_H;
    }

    var reserve = Math.min(cardH, layout.pageHeight - layout.marginTop - layout.marginBottom);
    y = sectionHeader(doc, layout, y, 5, App.PDFText.notesSectionTitle, { reserve: reserve });

    if (!trimmed) {
      y = ensureSpace(doc, layout, y, emptyH);
      card(doc, cardX, y, cardW, emptyH, { border: COLORS.goldSoft });
      T(doc, App.PDFText.noNotesText, layout.pageWidth / 2, y + emptyH / 2 + 4, 'center', { size: 10.5, color: COLORS.muted });
      return y + emptyH + GAP_MD;
    }

    y = ensureSpace(doc, layout, y, Math.min(cardH, layout.pageHeight));
    card(doc, cardX, y, cardW, cardH, { border: COLORS.goldSoft });

    // Notes are free-form user text (often Arabic, entered in the app's
    // Arabic UI) — rendered right-aligned so Arabic prose reads naturally;
    // T() auto-detects and shapes it regardless of language.
    var cy = y + CARD_PAD + 10;
    paragraphs.forEach(function (paragraph) {
      if (paragraph.trim() === '') { cy += ROW_H; return; }
      var lines = doc.splitTextToSize(paragraph, maxWidth);
      lines.forEach(function (line) {
        cy = ensureSpace(doc, layout, cy, ROW_H);
        T(doc, line, cardX + cardW - CARD_PAD, cy, 'right', { size: 10.5 });
        cy += ROW_H;
      });
    });

    return y + cardH + GAP_MD;
  }

  // =========================================================
  // 6. Driver Orders (full detail) — a dedicated, always-fresh-page section
  // listing every single order per driver, by name. Kept separate from the
  // Drivers section above so a driver with 20-30 orders doesn't bloat their
  // summary card there; this is the place for the full itemized list.
  // =========================================================

  function driverOrdersBlockHeight(driver) {
    var orderCount = (driver.orderAmounts || []).length;
    return CARD_PAD * 2 + 20 + orderCount * ROW_H;
  }

  function drawDriverOrdersBlock(doc, layout, driver, index, y) {
    var name = driver.name && driver.name.trim() ? driver.name.trim() : App.PDFText.driverFallbackPrefix + ' ' + (index + 1);
    var orderAmounts = driver.orderAmounts || [];

    var cardH = driverOrdersBlockHeight(driver);
    var cardX = layout.marginLeft;
    var cardW = layout.pageWidth - layout.marginLeft - layout.marginRight;

    y = ensureSpace(doc, layout, y, cardH);
    card(doc, cardX, y, cardW, cardH);

    var cy = y + CARD_PAD + 10;
    T(doc, name, cardX + CARD_PAD, cy, 'left', { bold: true, size: 12.5, color: COLORS.gold });
    cy += 20;

    orderAmounts.forEach(function (amount, i) {
      cy = row(doc, layout, cy, App.PDFText.orderLabelPrefix + ' ' + (i + 1), amount === null || amount === undefined ? '—' : App.UI.formatCurrency(amount));
    });

    return y + cardH + GAP_SM;
  }

  function drawDriverOrdersSection(doc, layout, drivers, y) {
    // Keep each driver's original index (matching the fallback name used in
    // the Drivers section above) even after filtering out driver with no orders.
    var driversWithOrders = drivers
      .map(function (driver, index) { return { driver: driver, index: index }; })
      .filter(function (entry) { return (entry.driver.orderAmounts || []).length > 0; });

    // Always start this section on its own fresh page — it is meant to be
    // a self-contained "page 3"-style appendix, not squeezed under notes.
    y = newPage(doc, layout);

    var reserve = driversWithOrders.length > 0 ? driverOrdersBlockHeight(driversWithOrders[0].driver) : 0;
    y = sectionHeader(doc, layout, y, 6, App.PDFText.driverOrdersSectionTitle, { reserve: reserve });

    if (driversWithOrders.length === 0) {
      T(doc, App.PDFText.noDriverOrdersText, layout.marginLeft, y, 'left', { size: 10, color: COLORS.muted });
      return y + ROW_H + GAP_MD;
    }

    driversWithOrders.forEach(function (entry) {
      y = drawDriverOrdersBlock(doc, layout, entry.driver, entry.index, y);
    });

    return y + GAP_XS;
  }

  // =========================================================
  // Footer on every page (drawn in a second pass once the total page
  // count is known)
  // =========================================================

  function drawFooter(doc, layout, pageNumber, totalPages) {
    var y = layout.pageHeight - FOOTER_H + 8;
    divider(doc, layout, y, { width: 0.6 });
    y += 16;

    if (window.LOGO_BASE64) {
      circleClippedImage(doc, layout.marginLeft + 9, y - 4, 9, window.LOGO_BASE64, window.LOGO_FORMAT || 'JPEG');
      T(doc, App.PDFText.brandName, layout.marginLeft + 24, y, 'left', { bold: true, size: 8.5, color: COLORS.goldSoft });
    } else {
      T(doc, App.PDFText.brandName, layout.marginLeft, y, 'left', { bold: true, size: 8.5, color: COLORS.goldSoft });
    }

    T(doc, pageNumber + ' / ' + totalPages, layout.pageWidth - layout.marginRight, y, 'right', { font: 'helvetica', bold: true, size: 8.5, color: COLORS.muted, arabic: false });
  }

  // =========================================================
  // Final assembly
  // =========================================================

  App.PDF.generate = function (data, date) {
    var doc = createDoc();
    var layout = makeLayout(doc);
    fillPageBackground(doc, layout);
    var y = layout.marginTop;

    y = drawHeader(doc, layout, date, y);
    y = drawRevenueSection(doc, layout, data.revenue, y);
    y = drawEmployeesSection(doc, layout, data.employees, y);
    y = drawDriversSection(doc, layout, data.drivers, y);
    y = drawInvoicesSection(doc, layout, data.invoices, y);
    y = drawNotesSection(doc, layout, data.notes, y);
    drawDriverOrdersSection(doc, layout, data.drivers, y);

    var totalPages = doc.internal.getNumberOfPages();
    for (var i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, layout, i, totalPages);
    }

    return doc;
  };

  /**
   * Generate the report and download it immediately, with a filename that
   * includes the closing date.
   */
  App.PDF.generateAndDownload = function (data, date) {
    var doc = App.PDF.generate(data, date);
    var filename = App.PDFText.filenamePrefix + App.UI.formatDateDisplay(date) + '.pdf';
    doc.save(filename);
  };
})();

window.App = App;