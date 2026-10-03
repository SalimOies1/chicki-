// نقطة الدخول الرئيسية للتطبيق — تدير سير العمل اليومي الموجَّه (المرحلة 3)

(function () {
  'use strict';

  var el = App.UI.el;

  // تعريف خطوات الإغلاق اليومي بالترتيب
  var STEPS = [
    { id: 'revenue', title: 'الإيرادات والحسابات' },
    { id: 'employees', title: 'الموظفون' },
    { id: 'drivers', title: 'السائقون' },
    { id: 'invoices', title: 'الفواتير' },
    { id: 'notes', title: 'المشاكل والملاحظات' },
    { id: 'review', title: 'مراجعة كاملة' },
    { id: 'pdf', title: 'إنشاء PDF' }
  ];

  var state = {
    date: new Date(),
    currentStepIndex: 0,
    furthestStepIndex: 0,
    dateInputOpen: false,
    data: {
      revenue: {},
      employees: [],
      drivers: [],
      invoices: [],
      notes: ''
    }
  };

  App.Calculations.REVENUE_FIELDS.forEach(function (field) {
    state.data.revenue[field.key] = 0;
  });

  var nextEmployeeId = 1;
  function createEmployee() {
    return {
      id: 'emp-' + (nextEmployeeId++),
      name: '',
      hourlyWage: 0,
      startTime: '',
      endTime: '',
      drinks: 0,
      cashTaken: 0
    };
  }

  var nextDriverId = 1;
  function createDriver() {
    return {
      id: 'drv-' + (nextDriverId++),
      name: '',
      hourlyWage: 0,
      startTime: '',
      endTime: '',
      orderCount: 0,
      orderAmounts: [],
      drinks: 0,
      cashTaken: 0
    };
  }

  var nextInvoiceId = 1;
  function createInvoice() {
    return {
      id: 'inv-' + (nextInvoiceId++),
      name: '',
      amount: 0
    };
  }

  /**
   * تحديث صندوق تحذيرات (يُستخدم داخل كروت الموظفين والسائقين لعرض نتائج التحقق حيًّا)
   */
  function renderWarnings(container, messages) {
    container.textContent = '';
    if (!messages || messages.length === 0) return;
    var list = el('div', { style: 'display:flex; flex-direction:column; gap:6px;' });
    messages.forEach(function (msg) {
      list.appendChild(el('div', {
        class: 'status status--warning',
        style: 'display:flex; width:100%; justify-content:flex-start; text-align:right; white-space:normal;',
        text: '⚠️ ' + msg
      }));
    });
    container.appendChild(list);
  }

  function checkModulesLoaded() {
    var requiredModules = ['Storage', 'Calculations', 'Validation', 'UI', 'ArabicText', 'PDF'];
    var allLoaded = requiredModules.every(function (name) {
      return typeof App[name] === 'object';
    });
    console.log(allLoaded ? '✓ تم تحميل جميع الوحدات بنجاح' : '⚠️ حدث خطأ في تحميل بعض الوحدات');
    return allLoaded;
  }

  // =========================================================
  // بناء رأس التاريخ (قابل للتعديل)
  // =========================================================
  function buildDateHeader() {
    var dateInput = el('input', {
      class: 'field__control mt-4',
      type: 'date',
      value: App.UI.toISODate(state.date),
      style: state.dateInputOpen ? '' : 'display:none;',
      onchange: function (e) {
        var parts = e.target.value.split('-');
        if (parts.length === 3) {
          state.date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          render();
        }
      }
    });

    return el('div', { class: 'card' }, [
      el('p', { class: 'section-title', text: 'إغلاق اليوم' }),
      el('div', { style: 'display:flex; align-items:flex-start; justify-content:space-between; gap:12px;' }, [
        el('div', {}, [
          el('div', { class: 'stat__value', text: App.UI.formatDateDisplay(state.date) }),
          el('div', { class: 'card__subtitle', text: App.UI.formatWeekday(state.date) })
        ]),
        el('button', {
          class: 'btn btn--ghost',
          type: 'button',
          text: 'تغيير',
          onclick: function () {
            state.dateInputOpen = !state.dateInputOpen;
            render();
          }
        })
      ]),
      dateInput
    ]);
  }

  // =========================================================
  // بناء شريط الخطوات (Stepper)
  // =========================================================
  function buildStepper() {
    var items = STEPS.map(function (step, index) {
      var isActive = index === state.currentStepIndex;
      var isReachable = index <= state.furthestStepIndex;
      var classes = ['stepper__item'];
      if (isActive) classes.push('stepper__item--active');
      if (!isReachable) classes.push('stepper__item--locked');

      return el('button', {
        class: classes.join(' '),
        type: 'button',
        disabled: !isReachable,
        onclick: function () {
          if (!isReachable) return;
          state.currentStepIndex = index;
          render();
        }
      }, [
        el('span', { class: 'stepper__num', text: String(index + 1) }),
        el('span', { class: 'stepper__label', text: step.title })
      ]);
    });

    return el('div', { class: 'stepper' }, items);
  }

  // =========================================================
  // بناء محتوى الخطوة الحالية — يُعيد مصفوفة عناصر (قد تكون أكثر من بطاقة)
  // =========================================================
  function buildStepContent() {
    var step = STEPS[state.currentStepIndex];

    if (step.id === 'revenue') return buildRevenueStep();
    if (step.id === 'employees') return buildEmployeesStep();
    if (step.id === 'drivers') return buildDriversStep();
    if (step.id === 'invoices') return buildInvoicesStep();
    if (step.id === 'notes') return buildNotesStep();
    if (step.id === 'review') return buildReviewStep();
    if (step.id === 'pdf') return buildPdfStep();

    var body = el('p', { class: 'card__text', text: 'سيتم إضافة هذا القسم قريبًا.' });

    return [el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: (state.currentStepIndex + 1) + '. ' + step.title })
      ]),
      body
    ])];
  }

  // =========================================================
  // خطوة 6: مراجعة كاملة — قائمة تحقق شاملة قبل إنشاء التقرير
  // =========================================================
  function buildReviewStep() {
    var result = App.Validation.validateClosing(state.data);

    var bannerCard = el('div', { class: 'card' }, [
      result.isValid
        ? el('div', { class: 'stat' }, [
            el('span', { class: 'status status--success', text: '✓ جميع البيانات مكتملة' }),
            el('span', { class: 'card__text mt-2', text: 'يمكنك الآن الانتقال إلى خطوة إنشاء التقرير.' })
          ])
        : el('div', { class: 'stat' }, [
            el('span', { class: 'status status--warning', text: '⚠️ يوجد بيانات تحتاج إلى مراجعة' }),
            el('span', { class: 'card__text mt-2', text: 'أكمل العناصر التالية قبل إنشاء التقرير.' })
          ])
    ]);

    function goToSection(stepIndex) {
      return function () {
        state.currentStepIndex = stepIndex;
        state.furthestStepIndex = Math.max(state.furthestStepIndex, stepIndex);
        render();
      };
    }

    var checklistRows = result.sections.map(function (section) {
      var rowChildren = [
        el('div', {
          class: 'list-row list-row--clickable',
          onclick: goToSection(section.stepIndex)
        }, [
          el('span', { class: 'list-row__label', text: section.label }),
          el('span', {
            class: section.ok ? 'status status--success' : 'status status--warning',
            text: section.ok ? '✓ مكتمل' : '⚠️ ' + section.items.length + ' يحتاج مراجعة'
          })
        ])
      ];

      section.items.forEach(function (item) {
        rowChildren.push(el('div', {
          class: 'list-row list-row--clickable',
          style: 'padding-right:12px;',
          onclick: goToSection(section.stepIndex)
        }, [
          el('span', { class: 'list-row__hint', text: '⚠️ ' + item.message })
        ]));
      });

      return rowChildren;
    });

    var flatRows = [].concat.apply([], checklistRows);
    var checklistCard = el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: '6. مراجعة كاملة' })
      ])
    ].concat(flatRows));

    return [bannerCard, checklistCard]
      .concat(buildReviewRevenueSection())
      .concat(buildReviewEmployeesSection())
      .concat(buildReviewDriversSection())
      .concat(buildReviewInvoicesSection())
      .concat(buildReviewNotesSection());
  }

  function reviewRow(label, value, opts) {
    opts = opts || {};
    return el('div', { class: 'card__row' }, [
      el('span', { class: 'card__row-label', text: label }),
      el('span', { class: 'card__row-value', style: opts.style || '', text: value })
    ]);
  }

  function buildReviewRevenueSection() {
    var revenue = state.data.revenue;
    var rows = App.Calculations.REVENUE_FIELDS.map(function (field) {
      var label = field.labelAr + (field.labelDe ? ' (' + field.labelDe + ')' : '');
      return reviewRow(label, App.UI.formatCurrency(revenue[field.key]));
    });

    var total = App.Calculations.calculateRevenueTotal(revenue);

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: 'الإيرادات' })
      ])
    ].concat(rows).concat([
      reviewRow('الإجمالي', App.UI.formatCurrency(total), { style: 'font-size: var(--text-lg);' })
    ]));

    return [el('p', { class: 'section-title mt-4', text: 'مراجعة الإيرادات' }), card];
  }

  function buildReviewEmployeesSection() {
    var nodes = [el('p', { class: 'section-title mt-4', text: 'مراجعة الموظفين' })];

    if (state.data.employees.length === 0) {
      nodes.push(el('div', { class: 'card' }, [
        el('p', { class: 'card__text', text: 'لا يوجد موظفون.' })
      ]));
      return nodes;
    }

    state.data.employees.forEach(function (employee, index) {
      var result = App.Calculations.calculateEmployeeSettlement(employee);
      var name = employee.name && employee.name.trim() ? employee.name.trim() : 'موظف ' + (index + 1);
      var timeLabel = (employee.startTime || '--:--') + ' → ' + (employee.endTime || '--:--');

      nodes.push(el('div', { class: 'card' }, [
        el('div', { class: 'card__header' }, [
          el('span', { class: 'card__title', text: name }),
          el('span', { class: 'card__subtitle', text: timeLabel })
        ]),
        reviewRow('ساعات العمل', App.UI.formatHours(result.hours)),
        reviewRow('أجر الساعة', App.UI.formatCurrency(employee.hourlyWage)),
        reviewRow('أجر الساعات', App.UI.formatHours(result.hours) + ' × ' + App.UI.formatCurrency(employee.hourlyWage) + ' = ' + App.UI.formatCurrency(result.hourlyPay)),
        reviewRow('المشروبات', '-' + App.UI.formatCurrency(result.drinks)),
        reviewRow('المبلغ المسحوب', '-' + App.UI.formatCurrency(result.cashTaken)),
        reviewRow('الحساب النهائي', App.UI.formatCurrency(result.finalAmount), {
          style: 'font-size: var(--text-lg); color: ' + (result.finalAmount >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';'
        })
      ]));
    });

    return nodes;
  }

  function buildReviewDriversSection() {
    var nodes = [el('p', { class: 'section-title mt-4', text: 'مراجعة السائقين' })];

    if (state.data.drivers.length === 0) {
      nodes.push(el('div', { class: 'card' }, [
        el('p', { class: 'card__text', text: 'لا يوجد سائقون.' })
      ]));
      return nodes;
    }

    state.data.drivers.forEach(function (driver, index) {
      var result = App.Calculations.calculateDriverSettlement(driver);
      var name = driver.name && driver.name.trim() ? driver.name.trim() : 'سائق ' + (index + 1);
      var timeLabel = (driver.startTime || '--:--') + ' → ' + (driver.endTime || '--:--');

      var ordersLabel = result.orderAmounts.length === 0
        ? 'لا توجد طلبات'
        : result.orderAmounts.map(function (amount, i) {
            return (i + 1) + '. ' + (amount === null || amount === undefined ? '—' : App.UI.formatCurrency(amount));
          }).join('   ');

      var isDriverGives = result.direction === 'driver_gives';
      var isEven = result.direction === 'even';
      var settlementText = (isEven ? '— الحساب متوازن' : (isDriverGives ? '🟢 السائق يعطي المحل' : '🔴 المحل يعطي السائق')) +
        '  ' + App.UI.formatCurrency(result.difference);
      var settlementColor = isEven ? 'var(--color-text)' : (isDriverGives ? 'var(--color-success)' : 'var(--color-danger)');

      nodes.push(el('div', { class: 'card' }, [
        el('div', { class: 'card__header' }, [
          el('span', { class: 'card__title', text: name }),
          el('span', { class: 'card__subtitle', text: timeLabel })
        ]),
        reviewRow('ساعات العمل', App.UI.formatHours(result.hours)),
        reviewRow('أجر الساعة', App.UI.formatCurrency(driver.hourlyWage)),
        reviewRow('أجر الساعات', App.UI.formatHours(result.hours) + ' × ' + App.UI.formatCurrency(driver.hourlyWage) + ' = ' + App.UI.formatCurrency(result.hourlyPay)),
        reviewRow('عدد الطلبات', String(result.orderCount)),
        el('div', { class: 'card__row', style: 'flex-direction:column; align-items:flex-start; gap:4px;' }, [
          el('span', { class: 'card__row-label', text: 'قيم الطلبات' }),
          el('span', { class: 'field__hint', text: ordersLabel })
        ]),
        reviewRow('إجمالي كاش طلبات البار', App.UI.formatCurrency(result.barTotal)),
        reviewRow('أجر الطلبات', result.orderCount + ' × ' + App.UI.formatCurrency(App.Calculations.config.driverOrderPayment) + ' = ' + App.UI.formatCurrency(result.orderPay)),
        reviewRow('إجمالي حساب السائق', App.UI.formatCurrency(result.totalPay)),
        reviewRow('المشروبات', App.UI.formatCurrency(result.drinks)),
        reviewRow('المبلغ المسحوب', App.UI.formatCurrency(result.cashTaken)),
        reviewRow('التسوية', settlementText, { style: 'font-size: var(--text-lg); color: ' + settlementColor + ';' })
      ]));
    });

    return nodes;
  }

  function buildReviewInvoicesSection() {
    var nodes = [el('p', { class: 'section-title mt-4', text: 'مراجعة الفواتير' })];

    if (state.data.invoices.length === 0) {
      nodes.push(el('div', { class: 'card' }, [
        el('p', { class: 'card__text', text: 'لا توجد فواتير.' })
      ]));
      return nodes;
    }

    var rows = state.data.invoices.map(function (invoice, index) {
      var label = invoice.name && invoice.name.trim() ? invoice.name.trim() : 'فاتورة ' + (index + 1);
      return reviewRow(label, App.UI.formatCurrency(invoice.amount));
    });

    var total = App.Calculations.calculateInvoicesTotal(state.data.invoices);

    nodes.push(el('div', { class: 'card' }, rows.concat([
      reviewRow('الإجمالي', App.UI.formatCurrency(total), { style: 'font-size: var(--text-lg);' })
    ])));

    return nodes;
  }

  function buildReviewNotesSection() {
    var hasNotes = state.data.notes && state.data.notes.trim();
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: 'المشاكل والملاحظات' })
      ]),
      el('p', { class: 'card__text', style: 'white-space: pre-wrap;', text: hasNotes ? state.data.notes : 'لا توجد ملاحظات.' })
    ]);

    return [el('p', { class: 'section-title mt-4', text: 'مراجعة الملاحظات' }), card];
  }

  // =========================================================
  // خطوة 7: إنشاء PDF
  // =========================================================
  function buildPdfStep() {
    var result = App.Validation.validateClosing(state.data);
    var statusEl = el('p', { class: 'field__hint' });

    var generateButton = el('button', {
      class: 'btn btn--primary btn--block btn--lg',
      type: 'button',
      disabled: !result.isValid,
      text: '📄 إنشاء التقرير PDF',
      onclick: function () {
        statusEl.textContent = 'جارٍ إنشاء الملف...';
        statusEl.style.color = '';
        // تأخير بسيط يسمح برسم رسالة "جارٍ الإنشاء" قبل بدء العملية (قد تستغرق لحظة بسبب تضمين الخط)
        setTimeout(function () {
          try {
            App.PDF.generateAndDownload(state.data, state.date);
            statusEl.textContent = '✓ تم إنشاء التقرير وتنزيله بنجاح.';
            statusEl.style.color = 'var(--color-success)';
          } catch (err) {
            console.error(err);
            statusEl.textContent = '⚠️ حدث خطأ أثناء إنشاء الملف. حاول مرة أخرى.';
            statusEl.style.color = 'var(--color-danger)';
          }
        }, 10);
      }
    });

    var children = [generateButton];

    if (!result.isValid) {
      children.push(el('p', { class: 'field__hint', style: 'color: var(--color-danger);', text: 'يوجد بيانات ناقصة. عد إلى خطوة "مراجعة كاملة" لإصلاحها قبل إنشاء التقرير.' }));
      children.push(el('button', {
        class: 'btn btn--secondary btn--block',
        type: 'button',
        text: 'الذهاب إلى المراجعة',
        onclick: function () {
          state.currentStepIndex = STEPS.findIndex(function (s) { return s.id === 'review'; });
          render();
        }
      }));
    } else {
      children.push(statusEl);
    }

    return [el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: '7. إنشاء PDF' })
      ]),
      el('div', { style: 'display:flex; flex-direction:column; gap:10px;' }, children)
    ])];
  }

  // =========================================================
  // خطوة 1: الإيرادات والحسابات
  // =========================================================
  function buildRevenueStep() {
    var totalValueEl = el('span', {
      class: 'stat__value',
      text: App.UI.formatCurrency(App.Calculations.calculateRevenueTotal(state.data.revenue))
    });

    function refreshTotal() {
      totalValueEl.textContent = App.UI.formatCurrency(App.Calculations.calculateRevenueTotal(state.data.revenue));
    }

    var totalCard = el('div', { class: 'card' }, [
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat__label', text: 'إجمالي الإيرادات' }),
        totalValueEl
      ])
    ]);

    var fieldNodes = App.Calculations.REVENUE_FIELDS.map(function (field) {
      return buildRevenueFieldInput(field, refreshTotal);
    });

    var fieldsCard = el('div', {
      class: 'card',
      style: 'display:flex; flex-direction:column; gap:14px;'
    }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: '1. الإيرادات والحسابات' })
      ])
    ].concat(fieldNodes));

    return [totalCard, fieldsCard];
  }

  function buildRevenueFieldInput(field, onChange) {
    var currentValue = state.data.revenue[field.key];

    var input = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: currentValue ? currentValue : '',
      oninput: function (e) {
        state.data.revenue[field.key] = App.Validation.parseAmount(e.target.value);
        onChange();
      },
      onblur: function (e) {
        var v = state.data.revenue[field.key];
        e.target.value = v ? v : '';
      }
    });

    var labelChildren = [field.labelAr];
    if (field.labelDe) {
      labelChildren.push(el('span', { class: 'field__label-sub', text: field.labelDe }));
    }

    return el('label', { class: 'field' }, [
      el('span', { class: 'field__label' }, labelChildren),
      input
    ]);
  }

  // =========================================================
  // خطوة 2: الموظفون
  // =========================================================
  function buildEmployeesStep() {
    var nodes = [
      el('p', { class: 'section-title', text: '2. الموظفون' })
    ];

    if (state.data.employees.length === 0) {
      nodes.push(el('div', { class: 'card' }, [
        el('p', { class: 'card__text', text: 'لا يوجد موظفون بعد. اضغط "+ إضافة موظف" لإضافة أول موظف.' })
      ]));
    } else {
      state.data.employees.forEach(function (employee) {
        nodes.push(buildEmployeeCard(employee));
      });
    }

    nodes.push(el('button', {
      class: 'btn btn--secondary btn--block',
      type: 'button',
      text: '+ إضافة موظف',
      onclick: function () {
        state.data.employees.push(createEmployee());
        render();
      }
    }));

    return nodes;
  }

  function buildEmployeeCard(employee) {
    var warningsBox = el('div', { class: 'mt-2' });
    var timeRangeEl = el('span', { class: 'card__subtitle' });
    var hoursValueEl = el('span', { class: 'card__row-value' });
    var hourlyPayValueEl = el('span', { class: 'card__row-value' });
    var drinksValueEl = el('span', { class: 'card__row-value', style: 'color: var(--color-danger);' });
    var cashValueEl = el('span', { class: 'card__row-value', style: 'color: var(--color-danger);' });
    var finalValueEl = el('span', { class: 'card__row-value', style: 'font-size: var(--text-lg);' });

    function refresh() {
      var result = App.Calculations.calculateEmployeeSettlement(employee);
      var startLabel = employee.startTime || '--:--';
      var endLabel = employee.endTime || '--:--';
      timeRangeEl.textContent = startLabel + ' → ' + endLabel;
      hoursValueEl.textContent = App.UI.formatHours(result.hours);
      hourlyPayValueEl.textContent = App.UI.formatCurrency(result.hourlyPay);
      drinksValueEl.textContent = '-' + App.UI.formatCurrency(result.drinks);
      cashValueEl.textContent = '-' + App.UI.formatCurrency(result.cashTaken);
      finalValueEl.textContent = App.UI.formatCurrency(result.finalAmount);
      finalValueEl.style.color = result.finalAmount >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
      renderWarnings(warningsBox, App.Validation.validateEmployee(employee));
    }

    var nameInput = el('input', {
      class: 'field__control',
      type: 'text',
      placeholder: 'اسم الموظف',
      style: 'font-weight:700;',
      value: employee.name,
      oninput: function (e) {
        employee.name = e.target.value;
        refresh();
      }
    });

    var startTimeInput = el('input', {
      class: 'field__control',
      type: 'time',
      value: employee.startTime,
      onchange: function (e) {
        employee.startTime = e.target.value;
        refresh();
      }
    });

    var endTimeInput = el('input', {
      class: 'field__control',
      type: 'time',
      value: employee.endTime,
      onchange: function (e) {
        employee.endTime = e.target.value;
        refresh();
      }
    });

    var wageInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: employee.hourlyWage ? employee.hourlyWage : '',
      oninput: function (e) {
        employee.hourlyWage = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = employee.hourlyWage ? employee.hourlyWage : '';
      }
    });

    var drinksInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: employee.drinks ? employee.drinks : '',
      oninput: function (e) {
        employee.drinks = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = employee.drinks ? employee.drinks : '';
      }
    });

    var cashInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: employee.cashTaken ? employee.cashTaken : '',
      oninput: function (e) {
        employee.cashTaken = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = employee.cashTaken ? employee.cashTaken : '';
      }
    });

    var deleteButton = el('button', {
      class: 'btn btn--danger',
      type: 'button',
      text: '🗑',
      style: 'padding:0.6rem 0.8rem;',
      onclick: function () {
        var index = state.data.employees.indexOf(employee);
        if (index !== -1) state.data.employees.splice(index, 1);
        render();
      }
    });

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__header', style: 'align-items:center; gap:10px;' }, [
        el('div', { style: 'flex:1;' }, [nameInput]),
        deleteButton
      ]),
      warningsBox,
      timeRangeEl,
      el('div', { class: 'field-row mt-4' }, [
        el('label', { class: 'field' }, [
          el('span', { class: 'field__label', text: 'وقت البدء' }),
          startTimeInput
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'field__label', text: 'وقت الانتهاء' }),
          endTimeInput
        ])
      ]),
      el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__label', text: 'ساعات العمل' }),
        hoursValueEl
      ]),
      el('label', { class: 'field mt-2' }, [
        el('span', { class: 'field__label', text: 'الأجر بالساعة' }),
        wageInput
      ]),
      el('label', { class: 'field mt-2' }, [
        el('span', { class: 'field__label', text: 'المشروبات' }),
        drinksInput
      ]),
      el('label', { class: 'field mt-2' }, [
        el('span', { class: 'field__label', text: 'المبلغ المسحوب' }),
        cashInput
      ]),
      el('div', { class: 'mt-4' }, [
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'أجر الساعات' }),
          hourlyPayValueEl
        ]),
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'المشروبات' }),
          drinksValueEl
        ]),
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'المبلغ المسحوب' }),
          cashValueEl
        ]),
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'الحساب النهائي' }),
          finalValueEl
        ])
      ])
    ]);

    refresh();
    return card;
  }

  // =========================================================
  // خطوة 3: السائقون
  // =========================================================
  function buildDriversStep() {
    var nodes = [
      el('p', { class: 'section-title', text: '3. السائقون' })
    ];

    if (state.data.drivers.length === 0) {
      nodes.push(el('div', { class: 'card' }, [
        el('p', { class: 'card__text', text: 'لا يوجد سائقون بعد. اضغط "+ إضافة سائق" لإضافة أول سائق.' })
      ]));
    } else {
      state.data.drivers.forEach(function (driver) {
        nodes.push(buildDriverCard(driver));
      });
    }

    nodes.push(el('button', {
      class: 'btn btn--secondary btn--block',
      type: 'button',
      text: '+ إضافة سائق',
      onclick: function () {
        state.data.drivers.push(createDriver());
        render();
      }
    }));

    return nodes;
  }

  function buildDriverCard(driver) {
    // عناصر العرض التي تُحدَّث مباشرة دون إعادة بناء الكرت كاملاً (للحفاظ على التركيز أثناء الكتابة)
    var warningsBox = el('div', { class: 'mt-2' });
    var timeRangeEl = el('span', { class: 'card__subtitle' });
    var hoursValueEl = el('span', { class: 'card__row-value' });
    var hourlyPayValueEl = el('span', { class: 'card__row-value' });
    var hourlyPayFormulaEl = el('div', { class: 'field__hint' });
    var barTotalStatEl = el('span', { class: 'stat__value' });
    var orderPayValueEl = el('span', { class: 'card__row-value' });
    var orderPayFormulaEl = el('div', { class: 'field__hint' });
    var totalPayValueEl = el('span', { class: 'card__row-value', style: 'font-size: var(--text-lg);' });
    var settlementBarEl = el('span', { class: 'card__row-value' });
    var settlementPayEl = el('span', { class: 'card__row-value' });
    var settlementDiffEl = el('span', { class: 'card__row-value', style: 'font-size: var(--text-lg);' });
    var settlementBadgeEl = el('span', { class: 'status' });
    var settlementBigValueEl = el('span', { class: 'stat__value' });

    var orderRowsContainer = el('div', { style: 'display:flex; flex-direction:column; gap:10px;' });
    var countInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'numeric',
      min: '0',
      step: '1',
      placeholder: '0',
      value: driver.orderCount ? driver.orderCount : '',
      oninput: function (e) {
        var n = Math.max(0, Math.floor(Number(e.target.value)) || 0);
        resizeOrders(n);
        renderOrderRows();
        refresh();
      },
      onblur: function (e) {
        e.target.value = driver.orderCount ? driver.orderCount : '';
      }
    });

    function resizeOrders(newCount) {
      while (driver.orderAmounts.length < newCount) driver.orderAmounts.push(null);
      while (driver.orderAmounts.length > newCount) driver.orderAmounts.pop();
      driver.orderCount = newCount;
    }

    function buildOrderRow(index) {
      var amount = driver.orderAmounts[index];
      var input = el('input', {
        class: 'field__control',
        type: 'number',
        inputmode: 'decimal',
        min: '0',
        step: '0.01',
        placeholder: '0,00',
        value: (amount === null || amount === undefined) ? '' : amount,
        oninput: function (e) {
          driver.orderAmounts[index] = App.Validation.parseAmountOrNull(e.target.value);
          refresh();
        },
        onblur: function (e) {
          var v = driver.orderAmounts[index];
          e.target.value = (v === null || v === undefined) ? '' : v;
        }
      });

      var removeBtn = el('button', {
        class: 'btn btn--danger',
        type: 'button',
        text: '✕',
        style: 'padding:0.5rem 0.7rem;',
        onclick: function () {
          driver.orderAmounts.splice(index, 1);
          driver.orderCount = driver.orderAmounts.length;
          countInput.value = driver.orderCount ? driver.orderCount : '';
          renderOrderRows();
          refresh();
        }
      });

      return el('div', { style: 'display:flex; align-items:flex-end; gap:8px;' }, [
        el('label', { class: 'field', style: 'flex:1;' }, [
          el('span', { class: 'field__label', text: 'الطلب رقم ' + (index + 1) }),
          input
        ]),
        removeBtn
      ]);
    }

    function renderOrderRows() {
      orderRowsContainer.textContent = '';
      driver.orderAmounts.forEach(function (_, index) {
        orderRowsContainer.appendChild(buildOrderRow(index));
      });
    }

    var addOrderButton = el('button', {
      class: 'btn btn--ghost btn--block',
      type: 'button',
      text: '+ إضافة طلب',
      onclick: function () {
        resizeOrders(driver.orderAmounts.length + 1);
        countInput.value = driver.orderCount;
        renderOrderRows();
        refresh();
      }
    });

    function refresh() {
      var result = App.Calculations.calculateDriverSettlement(driver);
      var startLabel = driver.startTime || '--:--';
      var endLabel = driver.endTime || '--:--';

      timeRangeEl.textContent = startLabel + ' → ' + endLabel;

      hoursValueEl.textContent = App.UI.formatHours(result.hours);
      hourlyPayValueEl.textContent = App.UI.formatCurrency(result.hourlyPay);
      hourlyPayFormulaEl.textContent = App.UI.formatHours(result.hours) + ' × ' +
        App.UI.formatCurrency(driver.hourlyWage) + ' = ' + App.UI.formatCurrency(result.hourlyPay);

      barTotalStatEl.textContent = App.UI.formatCurrency(result.barTotal);

      orderPayValueEl.textContent = App.UI.formatCurrency(result.orderPay);
      orderPayFormulaEl.textContent = result.orderCount + ' × ' +
        App.UI.formatCurrency(App.Calculations.config.driverOrderPayment) + ' = ' + App.UI.formatCurrency(result.orderPay);

      totalPayValueEl.textContent = App.UI.formatCurrency(result.totalPay);

      settlementBarEl.textContent = App.UI.formatCurrency(result.barTotal);
      settlementPayEl.textContent = App.UI.formatCurrency(result.totalPay);
      settlementDiffEl.textContent = App.UI.formatCurrency(result.difference);

      var isDriverGives = result.direction === 'driver_gives';
      var isEven = result.direction === 'even';
      var badgeClass = isEven ? 'status status--neutral' : (isDriverGives ? 'status status--success' : 'status status--danger');
      var badgeText = isEven ? '— الحساب متوازن' : (isDriverGives ? '🟢 السائق يعطي المحل' : '🔴 المحل يعطي السائق');
      var valueClass = isEven ? 'stat__value' : (isDriverGives ? 'stat__value stat__value--success' : 'stat__value stat__value--danger');

      settlementBadgeEl.className = badgeClass;
      settlementBadgeEl.textContent = badgeText;
      settlementBigValueEl.className = valueClass;
      settlementBigValueEl.textContent = App.UI.formatCurrency(result.difference);

      renderWarnings(warningsBox, App.Validation.validateDriver(driver));
    }

    var nameInput = el('input', {
      class: 'field__control',
      type: 'text',
      placeholder: 'اسم السائق',
      style: 'font-weight:700;',
      value: driver.name,
      oninput: function (e) {
        driver.name = e.target.value;
        refresh();
      }
    });

    var startTimeInput = el('input', {
      class: 'field__control',
      type: 'time',
      value: driver.startTime,
      onchange: function (e) {
        driver.startTime = e.target.value;
        refresh();
      }
    });

    var endTimeInput = el('input', {
      class: 'field__control',
      type: 'time',
      value: driver.endTime,
      onchange: function (e) {
        driver.endTime = e.target.value;
        refresh();
      }
    });

    var wageInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: driver.hourlyWage ? driver.hourlyWage : '',
      oninput: function (e) {
        driver.hourlyWage = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = driver.hourlyWage ? driver.hourlyWage : '';
      }
    });

    var drinksInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: driver.drinks ? driver.drinks : '',
      oninput: function (e) {
        driver.drinks = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = driver.drinks ? driver.drinks : '';
      }
    });

    var cashInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      value: driver.cashTaken ? driver.cashTaken : '',
      oninput: function (e) {
        driver.cashTaken = App.Validation.parseAmount(e.target.value);
        refresh();
      },
      onblur: function (e) {
        e.target.value = driver.cashTaken ? driver.cashTaken : '';
      }
    });

    var deleteButton = el('button', {
      class: 'btn btn--danger',
      type: 'button',
      text: '🗑',
      style: 'padding:0.6rem 0.8rem;',
      onclick: function () {
        var index = state.data.drivers.indexOf(driver);
        if (index !== -1) state.data.drivers.splice(index, 1);
        render();
      }
    });

    renderOrderRows();

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__header', style: 'align-items:center; gap:10px;' }, [
        el('div', { style: 'flex:1;' }, [nameInput]),
        deleteButton
      ]),
      warningsBox,
      timeRangeEl,

      el('div', { class: 'field-row mt-4' }, [
        el('label', { class: 'field' }, [
          el('span', { class: 'field__label', text: 'وقت البدء' }),
          startTimeInput
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'field__label', text: 'وقت الانتهاء' }),
          endTimeInput
        ])
      ]),
      el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__label', text: 'ساعات العمل' }),
        hoursValueEl
      ]),
      el('label', { class: 'field mt-2' }, [
        el('span', { class: 'field__label', text: 'الأجر بالساعة' }),
        wageInput
      ]),

      el('p', { class: 'section-title mt-4', text: 'طلبات البار' }),
      el('label', { class: 'field' }, [
        el('span', { class: 'field__label', text: 'عدد طلبات البار' }),
        countInput
      ]),
      orderRowsContainer,
      addOrderButton,
      el('div', { class: 'card mt-2', style: 'background-color: var(--color-surface-2);' }, [
        el('div', { class: 'stat' }, [
          el('span', { class: 'stat__label', text: 'إجمالي كاش طلبات البار' }),
          barTotalStatEl
        ])
      ]),

      el('div', { class: 'mt-4' }, [
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'أجر الساعات' }),
          hourlyPayValueEl
        ]),
        hourlyPayFormulaEl,
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'أجر الطلبات' }),
          orderPayValueEl
        ]),
        orderPayFormulaEl,
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'إجمالي حساب السائق' }),
          totalPayValueEl
        ])
      ]),

      el('label', { class: 'field mt-4' }, [
        el('span', { class: 'field__label', text: 'المشروبات' }),
        drinksInput
      ]),
      el('label', { class: 'field mt-2' }, [
        el('span', { class: 'field__label', text: 'المبلغ المسحوب' }),
        cashInput
      ]),

      el('p', { class: 'section-title mt-4', text: 'التسوية' }),
      el('div', {}, [
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'كاش طلبات البار' }),
          settlementBarEl
        ]),
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'حساب السائق' }),
          settlementPayEl
        ]),
        el('div', { class: 'card__row' }, [
          el('span', { class: 'card__row-label', text: 'الفرق' }),
          settlementDiffEl
        ])
      ]),
      el('div', { class: 'stat mt-2' }, [
        settlementBadgeEl,
        settlementBigValueEl
      ])
    ]);

    refresh();
    return card;
  }

  // =========================================================
  // خطوة 4: الفواتير
  // =========================================================
  function buildInvoicesStep() {
    var totalValueEl = el('span', {
      class: 'stat__value',
      text: App.UI.formatCurrency(App.Calculations.calculateInvoicesTotal(state.data.invoices))
    });

    function refreshTotal() {
      totalValueEl.textContent = App.UI.formatCurrency(App.Calculations.calculateInvoicesTotal(state.data.invoices));
    }

    var totalCard = el('div', { class: 'card' }, [
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat__label', text: 'إجمالي الفواتير' }),
        totalValueEl
      ])
    ]);

    var listContainer = el('div', { style: 'display:flex; flex-direction:column; gap:10px;' });

    function renderInvoiceRows() {
      listContainer.textContent = '';
      if (state.data.invoices.length === 0) {
        listContainer.appendChild(el('p', { class: 'card__text', text: 'لا توجد فواتير بعد. اضغط "+ إضافة فاتورة" لإضافة أول فاتورة.' }));
        return;
      }
      state.data.invoices.forEach(function (invoice) {
        listContainer.appendChild(buildInvoiceRow(invoice, refreshTotal, renderInvoiceRows));
      });
    }

    renderInvoiceRows();

    var listCard = el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: '4. الفواتير' })
      ]),
      listContainer
    ]);

    var addButton = el('button', {
      class: 'btn btn--secondary btn--block',
      type: 'button',
      text: '+ إضافة فاتورة',
      onclick: function () {
        state.data.invoices.push(createInvoice());
        renderInvoiceRows();
        refreshTotal();
      }
    });

    return [totalCard, listCard, addButton];
  }

  function buildInvoiceRow(invoice, onTotalChange, onRemove) {
    var nameInput = el('input', {
      class: 'field__control',
      type: 'text',
      placeholder: 'وصف الفاتورة',
      style: 'flex:2;',
      value: invoice.name,
      oninput: function (e) {
        invoice.name = e.target.value;
      }
    });

    var amountInput = el('input', {
      class: 'field__control',
      type: 'number',
      inputmode: 'decimal',
      min: '0',
      step: '0.01',
      placeholder: '0,00',
      style: 'flex:1;',
      value: invoice.amount ? invoice.amount : '',
      oninput: function (e) {
        invoice.amount = App.Validation.parseAmount(e.target.value);
        onTotalChange();
      },
      onblur: function (e) {
        e.target.value = invoice.amount ? invoice.amount : '';
      }
    });

    var deleteButton = el('button', {
      class: 'btn btn--danger',
      type: 'button',
      text: '🗑',
      style: 'padding:0.6rem 0.8rem;',
      onclick: function () {
        var index = state.data.invoices.indexOf(invoice);
        if (index !== -1) state.data.invoices.splice(index, 1);
        onRemove();
        onTotalChange();
      }
    });

    return el('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
      nameInput,
      amountInput,
      deleteButton
    ]);
  }

  // =========================================================
  // خطوة 5: المشاكل والملاحظات
  // =========================================================
  function buildNotesStep() {
    var textarea = el('textarea', {
      class: 'field__control',
      rows: 8,
      placeholder: 'مثال: السائق وصل متأخرًا. كان هناك نقص في الكاسا. تم إلغاء طلب...\n\nاتركه فارغًا إذا لم توجد أي مشاكل أو ملاحظات.',
      value: state.data.notes,
      oninput: function (e) {
        state.data.notes = e.target.value;
      }
    });

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__header' }, [
        el('span', { class: 'card__title', text: '5. المشاكل والملاحظات' })
      ]),
      textarea
    ]);

    return [card];
  }

  // =========================================================
  // بناء أزرار التنقل (السابق / التالي)
  // =========================================================
  function buildFooterNav() {
    var buttons = [];

    if (state.currentStepIndex > 0) {
      buttons.push(el('button', {
        class: 'btn btn--secondary btn--block',
        style: 'flex:1;',
        type: 'button',
        text: 'رجوع',
        onclick: function () {
          state.currentStepIndex -= 1;
          render();
        }
      }));
    }

    if (state.currentStepIndex < STEPS.length - 1) {
      buttons.push(el('button', {
        class: 'btn btn--primary btn--block',
        style: 'flex:1;',
        type: 'button',
        text: 'التالي',
        onclick: function () {
          state.currentStepIndex += 1;
          state.furthestStepIndex = Math.max(state.furthestStepIndex, state.currentStepIndex);
          render();
        }
      }));
    }

    if (buttons.length === 0) return null;
    return el('div', { style: 'display:flex; gap:10px;' }, buttons);
  }

  // =========================================================
  // العرض الرئيسي
  // =========================================================
  function render() {
    var app = document.getElementById('app');
    app.textContent = '';

    app.appendChild(buildDateHeader());
    app.appendChild(buildStepper());
    buildStepContent().forEach(function (node) {
      app.appendChild(node);
    });

    var footer = buildFooterNav();
    if (footer) app.appendChild(footer);

    var activeStepperItem = app.querySelector('.stepper__item--active');
    if (activeStepperItem) {
      activeStepperItem.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }

  function init() {
    checkModulesLoaded();
    App.UI.initBottomNav();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
