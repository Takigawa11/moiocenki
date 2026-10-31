'use strict';

/* ============================================================
   Мои оценки — логика приложения
   Данные хранятся в localStorage браузера.
   ============================================================ */

const STORE_KEY = 'myGrades.v4';
const LEGACY_KEYS = ['myGrades.v2', 'myGrades.v3'];

/* Данные пока хранятся локально в браузере.
   Когда появится API, загрузку можно заменить в loadState(),
   а сохранение — в saveState(). */

const SEMESTERS = [
  { id: 1, label: '1 семестр', short: '1 сем.', start: '2026-09-01', end: '2026-12-28', session: 'зимняя сессия', sessionDates: '21–27 декабря 2026' },
  { id: 2, label: '2 семестр', short: '2 сем.', start: '2027-01-11', end: '2027-06-28', session: 'летняя сессия', sessionDates: '21–27 июня 2027' }
];

const THRESHOLDS = { five: 4.5, four: 3.5, three: 2.5 };

/* Версия учебного плана: нужна, чтобы обновить часы и зачёты
   у уже сохранённых предметов, не стирая выставленные оценки. */
const CURRICULUM_VERSION = 3;

const ASSESSMENT_LABELS = { exam: 'Экзамен', credit: 'Диф. зачёт' };

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const PAGE_TITLES = {
  today: 'Сегодня',
  grades: 'Оценки',
  semester: 'Итоги семестра',
  settings: 'Настройки'
};

const GRADE_TYPES = {
  lesson:      { label: 'Работа на занятии', short: 'Занятие',     weight: 1 },
  homework:    { label: 'Домашняя работа', short: 'Домашняя',    weight: 1 },
  oral:        { label: 'Устный ответ',    short: 'Устный',      weight: 2 },
  independent: { label: 'Самостоятельная', short: 'Самост.',     weight: 2 },
  test:        { label: 'Тест',            short: 'Тест',        weight: 2 },
  control:     { label: 'Контрольная',     short: 'Контрольная', weight: 3 },
  project:     { label: 'Проект',          short: 'Проект',      weight: 3 }
};

const PALETTE = ['#16a34a', '#0d9488', '#65a30d', '#059669', '#0891b2', '#4d7c0f',
                 '#0284c7', '#14b8a6', '#ca8a04', '#22c55e', '#0f766e', '#84cc16'];

// Предметы, часы и форма аттестации из графика учебного процесса (1Р-2, 2026/2027)
const SUBJECT_SEED = [
  { name: 'Русский язык', hours: [32, 44], attestation: ['exam', 'credit'] },
  { name: 'Литература', hours: [32, 88], attestation: [null, 'exam'] },
  { name: 'Математика', hours: [108, 132], attestation: [null, 'exam'] },
  { name: 'Иностранный язык', hours: [48, 56], attestation: [null, 'credit'] },
  { name: 'Информатика', hours: [80, 68], attestation: ['exam', 'credit'] },
  { name: 'Физика', hours: [48, 44], attestation: [null, 'exam'] },
  { name: 'Химия', hours: [48, 0], attestation: ['credit', null] },
  { name: 'Биология', hours: [32, 44], attestation: [null, 'credit'] },
  { name: 'История', hours: [32, 22], attestation: [null, null] },
  { name: 'Обществознание', hours: [0, 22], attestation: [null, null] },
  { name: 'География', hours: [0, 22], attestation: [null, null] },
  { name: 'Физическая культура', hours: [32, 44], attestation: [null, 'credit'] },
  { name: 'Основы безопасности и защиты Родины', hours: [36, 44], attestation: [null, 'credit'] },
  { name: 'Введение в специальность', hours: [32, 0], attestation: ['exam', null] },
  { name: 'Родной язык', hours: [0, 44], attestation: [null, 'credit'] },
  { name: 'Основы работы с информацией', hours: [0, 36], attestation: [null, 'credit'] },
  { name: 'Психология общения', hours: [0, 44], attestation: [null, 'credit'] },
  { name: 'Основы учебно-производственной деятельности', hours: [16, 22], attestation: [null, 'credit'] },
  { name: 'ПМ.01 Разработка, администрирование и защита баз данных', hours: [0, 20], attestation: [null, null] },
  { name: 'МДК 01.01 Проектирование и разработка баз данных', hours: [0, 20], attestation: [null, null] },
  { name: 'Индивидуальный проект', hours: [0, 32], attestation: [null, 'credit'] }
];

/* ---------- Утилиты ---------- */

function uid() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISO(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function parseISO(iso) {
  const parts = String(iso).split('-').map(Number);
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

function todayISO() {
  return toISO(new Date());
}

function addDays(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function weekdayMon0(iso) {
  const jsDay = parseISO(iso).getDay();
  return (jsDay + 6) % 7; // 0 — понедельник, 6 — воскресенье
}

function formatDate(iso) {
  const d = parseISO(iso);
  return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateFull(iso) {
  const d = parseISO(iso);
  return formatDate(iso) + ', ' + WEEKDAY_FULL[d.getDay()];
}

function formatDateShort(iso) {
  const d = parseISO(iso);
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
}

function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function icon(name, cls) {
  return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
}

/* ---------- Настройки и состояние ---------- */

function defaultSettings() {
  return {
    student: 'Усманов Артур Ильнурович',
    group: '1 курс, группа 1Р-2',
    theme: 'system',
    curriculumVersion: CURRICULUM_VERSION
  };
}

function makeSeedSubjects() {
  return SUBJECT_SEED.map(function (item, i) {
    return {
      id: 's' + (i + 1),
      name: item.name,
      color: PALETTE[i % PALETTE.length],
      hours: { 1: item.hours[0], 2: item.hours[1] },
      attestation: { 1: item.attestation[0], 2: item.attestation[1] }
    };
  });
}

function makeInitialState() {
  return normalizeState({
    settings: defaultSettings(),
    subjects: makeSeedSubjects(),
    grades: [],
    assessments: {}
  });
}

/* ---------- Состояние ---------- */

function normalizeHours(value) {
  const n = Number(value);
  return isFinite(n) && n > 0 ? Math.min(1000, Math.round(n)) : 0;
}

function normalizeAttestation(value) {
  return value === 'exam' || value === 'credit' ? value : null;
}

function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const settings = defaultSettings();
  settings.curriculumVersion = 1;
  if (src.settings && typeof src.settings === 'object') {
    if (src.settings.student) settings.student = String(src.settings.student);
    if (typeof src.settings.group === 'string') settings.group = src.settings.group;
    if (['light', 'dark', 'system'].indexOf(src.settings.theme) !== -1) settings.theme = src.settings.theme;
    if (Number(src.settings.curriculumVersion) === CURRICULUM_VERSION) settings.curriculumVersion = CURRICULUM_VERSION;
  }

  const subjects = Array.isArray(src.subjects)
    ? src.subjects.filter(function (s) { return s && s.id && s.name; }).map(function (s, index) {
        const hours = s.hours && typeof s.hours === 'object' ? s.hours : {};
        const attestation = s.attestation && typeof s.attestation === 'object' ? s.attestation : {};
        return {
          id: String(s.id),
          name: String(s.name),
          color: /^#[0-9a-fA-F]{3,8}$/.test(String(s.color || '')) ? String(s.color) : PALETTE[index % PALETTE.length],
          hours: {
            1: normalizeHours(hours[1] != null ? hours[1] : hours['1']),
            2: normalizeHours(hours[2] != null ? hours[2] : hours['2'])
          },
          attestation: {
            1: normalizeAttestation(attestation[1] != null ? attestation[1] : attestation['1']),
            2: normalizeAttestation(attestation[2] != null ? attestation[2] : attestation['2'])
          }
        };
      })
    : [];

  const subjectIds = new Set(subjects.map(function (s) { return s.id; }));

  const grades = Array.isArray(src.grades)
    ? src.grades.filter(function (g) { return g && g.subjectId && g.date && subjectIds.has(String(g.subjectId)); }).map(function (g) {
        const type = GRADE_TYPES[g.type] ? g.type : 'lesson';
        return {
          id: g.id ? String(g.id) : uid(),
          subjectId: String(g.subjectId),
          date: String(g.date),
          type: type,
          weight: Math.max(1, Math.min(5, Number(g.weight) || GRADE_TYPES[type].weight)),
          value: Math.max(2, Math.min(5, Math.round(Number(g.value) || 5))),
          comment: String(g.comment || '')
        };
      })
    : [];

  const assessments = {};
  if (src.assessments && typeof src.assessments === 'object') {
    Object.keys(src.assessments).forEach(function (subjectId) {
      if (!subjectIds.has(subjectId)) return;
      const perSemester = src.assessments[subjectId];
      if (!perSemester || typeof perSemester !== 'object') return;

      const result = {};
      SEMESTERS.forEach(function (semester) {
        const raw = perSemester[semester.id] || perSemester[String(semester.id)];
        if (!raw) return;
        const value = Math.round(Number(raw.value));
        if (!(value >= 2 && value <= 5)) return;
        result[semester.id] = {
          value: value,
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? String(raw.date) : '',
          comment: String(raw.comment || '')
        };
      });

      if (Object.keys(result).length) assessments[subjectId] = result;
    });
  }

  return { settings: settings, subjects: subjects, grades: grades, assessments: assessments };
}

/* Обновляет часы и формы аттестации у предметов из учебного плана,
   не трогая уже выставленные оценки. */
function applyCurriculumPatch(target) {
  if (!target || target.settings.curriculumVersion === CURRICULUM_VERSION) return target;

  const seedByName = {};
  SUBJECT_SEED.forEach(function (item) { seedByName[item.name.toLowerCase()] = item; });

  if (!target.subjects.length) {
    target.subjects = makeSeedSubjects();
  } else {
    const existingNames = {};
    target.subjects.forEach(function (subject) { existingNames[subject.name.toLowerCase()] = true; });

    makeSeedSubjects().forEach(function (subject) {
      if (existingNames[subject.name.toLowerCase()]) return;
      subject.id = uid();
      target.subjects.push(subject);
    });
  }

  target.subjects.forEach(function (subject) {
    const seed = seedByName[subject.name.toLowerCase()];
    if (!seed) return;
    subject.hours = { 1: seed.hours[0], 2: seed.hours[1] };
    subject.attestation = { 1: seed.attestation[0], 2: seed.attestation[1] };
  });

  target.settings.curriculumVersion = CURRICULUM_VERSION;
  return target;
}

function loadState() {
  LEGACY_KEYS.forEach(function (key) {
    try { localStorage.removeItem(key); } catch (err) {}
  });

  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const loaded = applyCurriculumPatch(normalizeState(JSON.parse(raw)));
      try { localStorage.setItem(STORE_KEY, JSON.stringify(loaded)); } catch (err) {}
      return loaded;
    }
  } catch (err) {
    console.warn('Не удалось прочитать сохранённые данные', err);
  }

  const initial = makeInitialState();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(initial));
  } catch (err) {}
  return initial;
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) {
    toast('Не удалось сохранить данные в браузере', 'error');
  }
}

let state = loadState();

function defaultSemesterId() {
  return todayISO() >= SEMESTERS[1].start ? 2 : 1;
}

const initialSemester = semesterById(defaultSemesterId());
const initialToday = todayISO();

const ui = {
  view: 'today',
  subject: 'all',
  period: 'semester',
  day: initialToday >= initialSemester.start && initialToday <= initialSemester.end ? initialToday : initialSemester.start,
  semester: initialSemester.id
};

const mq = window.matchMedia('(prefers-color-scheme: dark)');

/* ---------- Расчёты ---------- */

function getSubject(id) {
  return state.subjects.find(function (s) { return s.id === id; }) || null;
}

function typeOf(grade) {
  return GRADE_TYPES[grade.type] || GRADE_TYPES.lesson;
}

function gradeWeight(grade) {
  return Number(grade.weight) || typeOf(grade).weight || 1;
}

function semesterById(id) {
  const num = Number(id);
  return SEMESTERS.find(function (s) { return s.id === num; }) || SEMESTERS[0];
}

function currentSemester() {
  return semesterById(ui.semester);
}

function defaultDateForSemester(semester) {
  const sem = semester || currentSemester();
  const today = todayISO();
  return today >= sem.start && today <= sem.end ? today : sem.start;
}

function inSemester(date) {
  const semester = currentSemester();
  return date >= semester.start && date <= semester.end;
}

function gradeFromAvg(avg) {
  const value = Math.round(avg * 100) / 100;
  if (value >= THRESHOLDS.five) return 5;
  if (value >= THRESHOLDS.four) return 4;
  if (value >= THRESHOLDS.three) return 3;
  return 2;
}

function subjectStats(subjectId) {
  const list = state.grades.filter(function (g) {
    return g.subjectId === subjectId && inSemester(g.date);
  });

  let points = 0;
  let max = 0;
  list.forEach(function (g) {
    const w = gradeWeight(g);
    points += g.value * w;
    max += 5 * w;
  });

  const avg = max ? Math.round((points / max) * 500) / 100 : 0;
  return {
    list: list,
    count: list.length,
    points: points,
    max: max,
    avg: avg,
    grade: list.length ? gradeFromAvg(avg) : null
  };
}

function overallStats() {
  const stats = state.subjects.map(function (subject) {
    const st = subjectStats(subject.id);
    st.subject = subject;
    return st;
  });

  const active = stats.filter(function (s) { return s.count > 0; });
  const points = active.reduce(function (sum, s) { return sum + s.points; }, 0);
  const max = active.reduce(function (sum, s) { return sum + s.max; }, 0);

  return {
    stats: stats,
    active: active,
    count: active.reduce(function (sum, s) { return sum + s.count; }, 0),
    avg: max ? Math.round((points / max) * 500) / 100 : 0,
    finalGrade: active.length
      ? Math.round(active.reduce(function (sum, s) { return sum + s.grade; }, 0) / active.length)
      : null
  };
}

function semesterSubjects() {
  const semId = ui.semester;
  return state.subjects.filter(function (subject) {
    const hasSemesterHours = Number(subject.hours && subject.hours[semId]) > 0;
    const hasSemesterAttestation = !!(subject.attestation && subject.attestation[semId]);
    const hasCurriculumData = Number(subject.hours && subject.hours[1]) > 0 ||
      Number(subject.hours && subject.hours[2]) > 0 ||
      !!(subject.attestation && (subject.attestation[1] || subject.attestation[2]));

    return hasSemesterHours || hasSemesterAttestation || !hasCurriculumData;
  });
}

function assessmentFor(subjectId, semId) {
  const bySemester = state.assessments[subjectId];
  return (bySemester && bySemester[semId]) || null;
}

function assessmentsForDate(date) {
  if (!inSemester(date)) return [];

  const semester = currentSemester();
  const items = [];
  Object.keys(state.assessments).forEach(function (subjectId) {
    const subject = getSubject(subjectId);
    if (!subject) return;
    const record = state.assessments[subjectId] && state.assessments[subjectId][semester.id];
    if (!record || record.date !== date) return;
    items.push({ subject: subject, record: record, semester: semester, form: subject.attestation[semester.id] });
  });
  return items.sort(function (a, b) { return a.subject.name.localeCompare(b.subject.name); });
}

function attestationLabel(value) {
  return ASSESSMENT_LABELS[value] || '—';
}

function formatThreshold(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

function filteredGrades() {
  let list = state.grades.slice();

  if (ui.subject !== 'all') {
    list = list.filter(function (g) { return g.subjectId === ui.subject; });
  }
  if (ui.period === 'semester') {
    list = list.filter(function (g) { return inSemester(g.date); });
  }
  if (ui.period === 'month') {
    const from = addDays(todayISO(), -30);
    list = list.filter(function (g) { return g.date >= from; });
  }

  return list.sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });
}

/* ---------- Мелкие HTML-блоки ---------- */

function markEl(value, cls) {
  return '<span class="mark mark-' + value + (cls ? ' ' + cls : '') + '">' + value + '</span>';
}

function emptyState(title, text, actionHtml, small) {
  return '' +
    '<div class="empty-state' + (small ? ' small' : '') + '">' +
      '<div class="empty-icon">' + icon('book') + '</div>' +
      '<div class="empty-title">' + esc(title) + '</div>' +
      (text ? '<p class="empty-text">' + esc(text) + '</p>' : '') +
      (actionHtml || '') +
    '</div>';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function studentParts() {
  return String(state.settings.student || 'Студент').trim().split(/\s+/).filter(Boolean);
}

function firstName() {
  const parts = studentParts();
  return parts[1] || parts[0] || 'студент';
}

function shortName() {
  const parts = studentParts();
  return parts.length > 1 ? parts[0] + ' ' + parts[1] : parts[0] || 'Студент';
}

function initials() {
  const parts = studentParts();
  const a = parts[0] ? parts[0][0] : '';
  const b = parts[1] ? parts[1][0] : '';
  return (a + b).toUpperCase() || 'У';
}

/* ---------- Блоки оценок ---------- */

function gradeItemHtml(grade, withDate) {
  const subject = getSubject(grade.subjectId);
  const type = typeOf(grade);

  return '' +
    '<div class="grade-item">' +
      markEl(grade.value) +
      '<div class="grade-info">' +
        '<div class="grade-title">' + esc(subject ? subject.name : 'Предмет удалён') + '</div>' +
        '<div class="grade-sub">' +
          (withDate ? formatDateShort(grade.date) + ' · ' : '') +
          type.label + ' · вес ' + gradeWeight(grade) +
          (grade.comment ? ' · ' + esc(grade.comment) : '') +
        '</div>' +
      '</div>' +
      '<div class="grade-actions">' +
        '<button class="icon-btn" type="button" data-action="edit-grade" data-id="' + esc(grade.id) + '" aria-label="Изменить оценку">' + icon('edit') + '</button>' +
        '<button class="icon-btn danger" type="button" data-action="delete-grade" data-id="' + esc(grade.id) + '" aria-label="Удалить оценку">' + icon('trash') + '</button>' +
      '</div>' +
    '</div>';
}

function assessmentItemHtml(item) {
  return '' +
    '<div class="grade-item">' +
      markEl(item.record.value) +
      '<div class="grade-info">' +
        '<div class="grade-title">' + esc(item.subject.name) + '</div>' +
        '<div class="grade-sub">' + attestationLabel(item.form) +
          (item.record.date ? ' · ' + formatDateShort(item.record.date) : '') +
          (item.record.comment ? ' · ' + esc(item.record.comment) : '') + '</div>' +
      '</div>' +
      '<div class="grade-actions">' +
        '<button class="icon-btn" type="button" data-action="edit-assessment" data-id="' + esc(item.subject.id) +
          '" data-semester="' + item.semester.id + '" aria-label="Изменить оценку за аттестацию">' + icon('edit') + '</button>' +
      '</div>' +
    '</div>';
}

function assessmentPreviewHtml(subject, record, semester) {
  const form = subject.attestation[semester.id];
  return '' +
    '<div class="grade-item">' +
      (record
        ? markEl(record.value)
        : '<span class="attest-empty">' + icon('check') + '</span>') +
      '<div class="grade-info">' +
        '<div class="grade-title">' + esc(subject.name) + '</div>' +
        '<div class="grade-sub">' + attestationLabel(form) + ' · ' +
          (record
            ? (record.date ? formatDateShort(record.date) : 'дата не указана')
            : 'оценка не выставлена') +
          (record && record.comment ? ' · ' + esc(record.comment) : '') + '</div>' +
      '</div>' +
      '<div class="grade-actions">' +
        (record
          ? '<button class="icon-btn" type="button" data-action="edit-assessment" data-id="' + esc(subject.id) +
              '" data-semester="' + semester.id + '" aria-label="Изменить оценку за аттестацию">' + icon('edit') + '</button>'
          : '<button class="btn btn-ghost btn-sm" type="button" data-action="edit-assessment" data-id="' + esc(subject.id) +
              '" data-semester="' + semester.id + '">Поставить</button>') +
      '</div>' +
    '</div>';
}

/* ---------- Главная страница ---------- */

function renderToday() {
  const today = todayISO();
  const semester = currentSemester();
  const o = overallStats();
  const avgText = o.count ? o.avg.toFixed(2) : '—';
  const subjects = semesterSubjects();

  const recent = state.grades
    .filter(function (g) { return inSemester(g.date); })
    .sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); })
    .slice(0, 5);

  const attestations = subjects
    .filter(function (s) { return !!s.attestation[semester.id]; })
    .sort(function (a, b) {
      const af = a.attestation[semester.id] === 'exam' ? 0 : 1;
      const bf = b.attestation[semester.id] === 'exam' ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name);
    });

  const doneCount = attestations.filter(function (s) {
    return !!assessmentFor(s.id, semester.id);
  }).length;

  const heroSub = state.subjects.length
    ? semester.label + ': ' + formatDate(semester.start) + ' — ' + formatDate(semester.end) +
      ' · средний балл ' + avgText + '.'
    : 'Добавьте предметы в настройках — и здесь появится ваша статистика.';

  const recentBody = recent.length
    ? '<div class="grade-list">' + recent.map(function (g) { return gradeItemHtml(g, true); }).join('') + '</div>'
    : emptyState(
        'Пока нет оценок',
        state.subjects.length ? 'Поставьте первую оценку за семестр — она появится здесь.' : 'Сначала добавьте предметы в настройках.',
        state.subjects.length
          ? '<button class="btn btn-primary btn-sm" data-action="add-grade">' + icon('plus') + ' Поставить оценку</button>'
          : '<button class="btn btn-primary btn-sm" data-action="nav" data-view="settings">' + icon('plus') + ' Добавить предметы</button>',
        true
      );

  const attestationBody = attestations.length
    ? '<div class="grade-list">' + attestations.slice(0, 4).map(function (subject) {
        return assessmentPreviewHtml(subject, assessmentFor(subject.id, semester.id), semester);
      }).join('') + '</div>'
    : emptyState('Нет зачётов и экзаменов', 'В этом семестре по вашим предметам нет аттестации.', '', true);

  return '' +
    '<section class="hero">' +
      '<div class="hero-copy">' +
        '<p class="hero-date">' + formatDate(today) + ', ' + WEEKDAY_FULL[parseISO(today).getDay()] + '</p>' +
        '<h1 class="hero-title">' + greeting() + ', ' + esc(firstName()) + '!</h1>' +
        '<p class="hero-sub">' + esc(heroSub) + '</p>' +
        '<div class="hero-progress">' +
          '<div class="hero-progress-bar"><span style="width:' + (o.count ? Math.round(o.avg * 20) : 0) + '%"></span></div>' +
          '<span class="hero-progress-label">Средний балл: ' + avgText + ' из 5.00</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-badge">' +
        '<span class="hero-badge-label">Семестровая</span>' +
        '<strong class="hero-badge-value">' + (o.finalGrade == null ? '—' : o.finalGrade) + '</strong>' +
        '<span class="hero-badge-note">прогноз</span>' +
      '</div>' +
    '</section>' +

    '<section class="stats">' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('chart') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Средний балл</span>' +
          '<strong class="stat-value">' + avgText + '</strong>' +
          '<span class="stat-note">из 5.00 за семестр</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('star') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Предметов</span>' +
          '<strong class="stat-value">' + subjects.length + '</strong>' +
          '<span class="stat-note">в этом семестре</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('grades') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Оценок</span>' +
          '<strong class="stat-value">' + o.count + '</strong>' +
          '<span class="stat-note">за текущий семестр</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('check') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Прогноз</span>' +
          '<strong class="stat-value">' + (o.finalGrade == null ? '—' : o.finalGrade) + '</strong>' +
          '<span class="stat-note">по текущим оценкам</span></div>' +
      '</article>' +
    '</section>' +

    '<div class="columns">' +
      '<article class="card">' +
        '<div class="card-head">' +
          '<div><h3 class="card-title">Последние оценки</h3>' +
            '<p class="card-sub">' + semester.label + ' · ' + o.count + ' ' +
              plural(o.count, ['оценка', 'оценки', 'оценок']) + '</p></div>' +
          '<button class="link" data-action="nav" data-view="grades">Все оценки →</button>' +
        '</div>' +
        recentBody +
      '</article>' +

      '<article class="card">' +
        '<div class="card-head">' +
          '<div><h3 class="card-title">Зачёты и экзамены</h3>' +
            '<p class="card-sub">' + semester.label + ' · ' + doneCount + ' из ' + attestations.length + '</p></div>' +
          '<button class="link" data-action="nav" data-view="semester">Все итоги →</button>' +
        '</div>' +
        attestationBody +
      '</article>' +
    '</div>';
}

/* ---------- Журнал оценок ---------- */

function renderGrades() {
  if (ui.subject !== 'all' && !getSubject(ui.subject)) ui.subject = 'all';
  if (!ui.day) ui.day = todayISO();

  const o = overallStats();
  const semGrades = state.grades.filter(function (g) { return inSemester(g.date); });
  const list = filteredGrades();
  const day = ui.day || todayISO();

  const dayGrades = state.grades
    .filter(function (g) { return g.date === day; })
    .sort(function (a, b) {
      const an = getSubject(a.subjectId) ? getSubject(a.subjectId).name : '';
      const bn = getSubject(b.subjectId) ? getSubject(b.subjectId).name : '';
      return an.localeCompare(bn);
    });

  const dayAssessments = assessmentsForDate(day);

  const availableSubjects = semesterSubjects();
  const availableSubjectIds = new Set(availableSubjects.map(function (s) { return s.id; }));
  if (ui.subject !== 'all' && !availableSubjectIds.has(ui.subject)) ui.subject = 'all';

  const subjectOptions = ['<option value="all"' + (ui.subject === 'all' ? ' selected' : '') + '>Все предметы</option>']
    .concat(availableSubjects.map(function (s) {
      return '<option value="' + s.id + '"' + (ui.subject === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    })).join('');

  const periodOptions = [
    ['semester', 'Текущий семестр'],
    ['month', 'Последние 30 дней'],
    ['all', 'Всё время']
  ].map(function (p) {
    return '<option value="' + p[0] + '"' + (ui.period === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
  }).join('');

  const rows = list.map(function (g) {
    const subject = getSubject(g.subjectId);
    const type = typeOf(g);
    return '' +
      '<tr>' +
        '<td><div class="date-cell">' + formatDateShort(g.date) + '<span class="wd">' + WEEKDAY_SHORT[weekdayMon0(g.date)] + '</span></div></td>' +
        '<td><span class="subject-cell"><i class="dot" style="background:' + esc(subject ? subject.color : '#94a3b8') + '"></i>' +
          esc(subject ? subject.name : 'Предмет удалён') + '</span></td>' +
        '<td>' + markEl(g.value, 'sm') + '</td>' +
        '<td><span class="type-badge">' + type.short + '</span>' +
          (gradeWeight(g) > 1 ? '<span class="weight-tag">×' + gradeWeight(g) + '</span>' : '') + '</td>' +
        '<td class="comment-cell col-hide-sm">' + (g.comment ? esc(g.comment) : '<span class="muted">—</span>') + '</td>' +
        '<td class="actions-col"><div class="actions">' +
          '<button class="icon-btn" type="button" data-action="edit-grade" data-id="' + esc(g.id) + '" aria-label="Изменить оценку">' + icon('edit') + '</button>' +
          '<button class="icon-btn danger" type="button" data-action="delete-grade" data-id="' + esc(g.id) + '" aria-label="Удалить оценку">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>';
  }).join('');

  const table = list.length
    ? '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>Дата</th><th>Предмет</th><th>Оценка</th><th>Тип</th><th class="col-hide-sm">Комментарий</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>'
    : emptyState('Оценок не найдено', 'Измените фильтры или добавьте новую оценку.', '<button class="btn btn-primary btn-sm" data-action="add-grade">' + icon('plus') + ' Добавить оценку</button>');

  const statsById = {};
  o.stats.forEach(function (st) { statsById[st.subject.id] = st; });

  const summarySubjects = semesterSubjects().slice().sort(function (a, b) {
    const as = statsById[a.id];
    const bs = statsById[b.id];
    const aHas = as && as.count > 0;
    const bHas = bs && bs.count > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const summaryRows = summarySubjects.length
    ? summarySubjects.map(function (subject) {
        const st = statsById[subject.id];
        return '<button class="summary-row" data-action="filter-subject" data-id="' + esc(subject.id) + '">' +
          '<i class="dot" style="background:' + esc(subject.color) + '"></i>' +
          '<span class="summary-name">' + esc(subject.name) + '</span>' +
          '<span class="summary-avg">' + (st && st.count ? st.avg.toFixed(2) : '—') + '</span>' +
          (st && st.grade ? markEl(st.grade, 'sm') : '<span class="summary-avg">—</span>') +
        '</button>';
      }).join('')
    : '<p class="settings-note">В этом семестре пока нет предметов с оценками.</p>';

  const dayCount = dayGrades.length + dayAssessments.length;
  const dayBody = dayCount
    ? '<div class="day-summary">' + formatDateFull(day) + ' · ' + dayCount + ' ' +
        plural(dayCount, ['оценка', 'оценки', 'оценок']) + '</div>' +
      '<div class="grade-list">' +
        dayGrades.map(function (g) { return gradeItemHtml(g); }).join('') +
        dayAssessments.map(assessmentItemHtml).join('') +
      '</div>'
    : emptyState('За этот день оценок нет', 'Выберите другую дату или добавьте оценку.', '', true);

  return '' +
    '<div class="page-head">' +
      '<div><h2 class="page-title">Журнал оценок</h2>' +
        '<p class="page-sub">' + semGrades.length + ' ' + plural(semGrades.length, ['оценка', 'оценки', 'оценок']) +
        ' за ' + currentSemester().label.toLowerCase() + ' · средний балл ' + (o.count ? o.avg.toFixed(2) : '—') + '</p></div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-primary" data-action="add-grade">' + icon('plus') + ' Добавить оценку</button>' +
      '</div>' +
    '</div>' +

    '<div class="toolbar card">' +
      '<label class="field-inline"><span>Предмет</span><select id="filterSubject">' + subjectOptions + '</select></label>' +
      '<label class="field-inline"><span>Период</span><select id="filterPeriod">' + periodOptions + '</select></label>' +
      '<span class="toolbar-note">Найдено: ' + list.length + '</span>' +
    '</div>' +

    '<section class="card day-card">' +
      '<div class="day-head">' +
        '<div><h3 class="card-title">Оценки за день</h3>' +
          '<p class="card-sub">Какие оценки и по каким предметам вы получили</p></div>' +
        '<div class="day-nav">' +
          '<button class="icon-btn" data-action="day-shift" data-delta="-1" aria-label="Предыдущий день">' + icon('arrow-right', 'flip') + '</button>' +
          '<input class="date-input" type="date" id="gradeDay" value="' + day + '" aria-label="Выбрать дату">' +
          '<button class="icon-btn" data-action="day-shift" data-delta="1" aria-label="Следующий день">' + icon('arrow-right') + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="day-today">Сегодня</button>' +
        '</div>' +
      '</div>' +
      dayBody +
    '</section>' +

    '<div class="grades-layout">' +
      '<section class="card table-card">' + table + '</section>' +
      '<aside class="card summary-card">' +
        '<div class="card-head"><div><h3 class="card-title">Сводка по семестру</h3>' +
          '<p class="card-sub">Средний балл и семестровая оценка</p></div></div>' +
        '<div class="summary-list">' + summaryRows + '</div>' +
        '<div class="summary-total"><span>Всего оценок</span><b>' + o.count + '</b></div>' +
        '<div class="summary-total" style="border:0;padding-top:6px"><span>Предметов</span><b>' + summarySubjects.length + '</b></div>' +
      '</aside>' +
    '</div>';
}

/* ---------- Итоги семестра ---------- */

function gradeWord(grade) {
  return { 5: 'отлично', 4: 'хорошо', 3: 'удовлетворительно', 2: 'плохо' }[grade] || '';
}

function renderSemester() {
  const o = overallStats();
  const semester = currentSemester();
  const semId = semester.id;
  const subjects = semesterSubjects();

  const statsById = {};
  o.stats.forEach(function (st) { statsById[st.subject.id] = st; });

  const sorted = subjects.slice().sort(function (a, b) {
    const as = statsById[a.id];
    const bs = statsById[b.id];
    const aHas = as && as.count > 0;
    const bHas = bs && bs.count > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const rows = sorted.map(function (subject) {
    const st = statsById[subject.id];
    const hours = Number(subject.hours && subject.hours[semId]) || 0;
    return '' +
      '<tr>' +
        '<td><span class="subject-cell"><i class="dot" style="background:' + esc(subject.color) + '"></i>' + esc(subject.name) + '</span></td>' +
        '<td class="num">' + (hours ? hours + ' ч' : '—') + '</td>' +
        '<td class="num">' + (st && st.count ? st.count : '—') + '</td>' +
        '<td class="num"><b>' + (st && st.count ? st.avg.toFixed(2) : '—') + '</b></td>' +
        '<td>' + (st && st.grade
          ? '<div class="grade-cell">' + markEl(st.grade, 'sm') + '<span class="muted col-hide-sm" style="font-size:12px">' + gradeWord(st.grade) + '</span></div>'
          : '<span class="muted">нет оценок</span>') + '</td>' +
      '</tr>';
  }).join('');

  const attestationSubjects = sorted.filter(function (subject) {
    return !!subject.attestation[semId];
  });

  const attestationDone = attestationSubjects.filter(function (subject) {
    return !!assessmentFor(subject.id, semId);
  }).length;

  const attestationRows = attestationSubjects.map(function (subject) {
    const record = assessmentFor(subject.id, semId);
    const form = subject.attestation[semId];
    return '' +
      '<tr>' +
        '<td><span class="subject-cell"><i class="dot" style="background:' + esc(subject.color) + '"></i>' + esc(subject.name) + '</span></td>' +
        '<td><span class="attest-badge ' + form + '">' + attestationLabel(form) + '</span></td>' +
        '<td class="num">' + (record && record.date ? formatDateShort(record.date) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (record ? markEl(record.value, 'sm') : '<span class="muted">—</span>') + '</td>' +
        '<td class="actions-col"><button class="btn btn-ghost btn-sm" type="button" data-action="edit-assessment" data-id="' +
          esc(subject.id) + '" data-semester="' + semId + '">' + (record ? 'Изменить' : 'Поставить') + '</button></td>' +
      '</tr>';
  }).join('');

  const attestationBody = attestationSubjects.length
    ? '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>Предмет</th><th>Форма</th><th class="num">Дата</th><th>Оценка</th><th></th></tr></thead>' +
        '<tbody>' + attestationRows + '</tbody>' +
      '</table></div>'
    : emptyState('Нет зачётов и экзаменов', 'В этом семестре по вашим предметам нет аттестации.', '', true);

  return '' +
    '<div class="page-head">' +
      '<div><h2 class="page-title">Итоги семестра</h2>' +
        '<p class="page-sub">' + semester.label + ' · ' + formatDate(semester.start) + ' — ' + formatDate(semester.end) + ' · ' + semester.session + ' ' + semester.sessionDates + '</p></div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-primary" data-action="add-grade">' + icon('plus') + ' Добавить оценку</button>' +
      '</div>' +
    '</div>' +

    '<section class="stats">' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('chart') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Средний балл</span>' +
          '<strong class="stat-value">' + (o.count ? o.avg.toFixed(2) : '—') + '</strong>' +
          '<span class="stat-note">взвешенный, из 5.00</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('grades') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Оценок</span>' +
          '<strong class="stat-value">' + o.count + '</strong>' +
          '<span class="stat-note">за семестр</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('star') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Предметов</span>' +
          '<strong class="stat-value">' + subjects.length + '</strong>' +
          '<span class="stat-note">в семестре</span></div>' +
      '</article>' +
      '<article class="stat-card">' +
        '<div class="stat-icon">' + icon('check') + '</div>' +
        '<div class="stat-body"><span class="stat-label">Прогноз</span>' +
          '<strong class="stat-value">' + (o.finalGrade == null ? '—' : o.finalGrade) + '</strong>' +
          '<span class="stat-note">средняя семестровая</span></div>' +
      '</article>' +
    '</section>' +

    '<section class="card table-card">' +
      (subjects.length
        ? '<div class="table-wrap"><table class="table">' +
            '<thead><tr><th>Предмет</th><th class="num">Часы</th><th class="num">Оценок</th><th class="num">Средний</th><th>Семестровая</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table></div>'
        : emptyState('В этом семестре нет предметов', 'Добавьте оценки или предметы в настройках.',
            '<button class="btn btn-primary btn-sm" data-action="nav" data-view="settings">' + icon('plus') + ' Добавить предмет</button>')) +
    '</section>' +

    '<section class="card table-card attestation-card">' +
      '<div class="card-head">' +
        '<div><h3 class="card-title">Зачёты и экзамены</h3>' +
          '<p class="card-sub">' + semester.label + ' · ' + attestationDone + ' из ' + attestationSubjects.length + ' отмечено</p></div>' +
      '</div>' +
      attestationBody +
    '</section>' +

    '<section class="card formula-card">' +
      '<div class="card-head"><div><h3 class="card-title">Как считается семестровая оценка</h3>' +
        '<p class="card-sub">Пороги фиксированы: 4,50 / 3,50 / 2,50</p></div></div>' +
      '<p class="modal-text">Каждая оценка имеет вес: обычная работа — 1, устный ответ, самостоятельная или тест — 2, ' +
        'контрольная или проект — 3. Сначала считается средний взвешенный балл по предмету, затем он переводится в семестровую оценку.</p>' +
      '<div class="formula-chips">' +
        '<span class="chip chip-5"><b>5</b> — от ' + formatThreshold(THRESHOLDS.five) + '</span>' +
        '<span class="chip chip-4"><b>4</b> — от ' + formatThreshold(THRESHOLDS.four) + '</span>' +
        '<span class="chip chip-3"><b>3</b> — от ' + formatThreshold(THRESHOLDS.three) + '</span>' +
        '<span class="chip chip-2"><b>2</b> — ниже ' + formatThreshold(THRESHOLDS.three) + '</span>' +
      '</div>' +
      '<p class="settings-note">Средний взвешенный балл = сумма (оценка × вес) ÷ сумма весов. ' +
        'Оценки за зачёт или экзамен фиксируются отдельно и не входят в средний балл.</p>' +
    '</section>';
}

/* ---------- Настройки ---------- */

function renderSettings() {
  const s = state.settings;

  const themes = [
    { id: 'light', label: 'Светлая', icon: 'sun', desc: 'Бело-зелёная' },
    { id: 'dark', label: 'Тёмная', icon: 'moon', desc: 'Чёрно-белая' },
    { id: 'system', label: 'Как в системе', icon: 'monitor', desc: 'Автоматически' }
  ];

  const themeCards = themes.map(function (theme) {
    return '' +
      '<button type="button" class="theme-card' + (s.theme === theme.id ? ' is-active' : '') + '" data-action="theme" data-theme-value="' + theme.id + '">' +
        '<span class="theme-preview ' + theme.id + '">' + icon(theme.icon) + '</span>' +
        '<strong>' + theme.label + '</strong>' +
        '<span class="theme-desc">' + theme.desc + '</span>' +
      '</button>';
  }).join('');

  const subjectsForSettings = semesterSubjects();
  const subjectRows = subjectsForSettings.length
    ? subjectsForSettings.map(function (subject) {
        const count = state.grades.filter(function (g) {
          return g.subjectId === subject.id && inSemester(g.date);
        }).length;
        const hours = Number(subject.hours && subject.hours[ui.semester]) || 0;
        const attestation = subject.attestation && subject.attestation[ui.semester];

        return '' +
          '<div class="subject-row">' +
            '<i class="dot" style="background:' + esc(subject.color) + '"></i>' +
            '<div style="min-width:0"><div class="name">' + esc(subject.name) + '</div>' +
              '<div class="subject-hours">' + currentSemester().label + ': ' + (hours ? hours + ' ч' : '—') +
                (attestation ? ' · ' + attestationLabel(attestation) : '') + '</div></div>' +
            '<span class="count">' + count + ' ' + plural(count, ['оценка', 'оценки', 'оценок']) + '</span>' +
            '<button class="icon-btn danger" type="button" data-action="delete-subject" data-id="' + esc(subject.id) + '" aria-label="Удалить предмет">' + icon('trash') + '</button>' +
          '</div>';
      }).join('')
    : '<p class="settings-note">В выбранном семестре пока нет предметов.</p>';

  return '' +
    '<div class="page-head">' +
      '<div><h2 class="page-title">Настройки</h2>' +
        '<p class="page-sub">Профиль, оформление и предметы</p></div>' +
    '</div>' +

    '<div class="settings-grid">' +
      '<section class="card">' +
        '<h3 class="card-title">Студент</h3>' +
        '<p class="card-sub">Имя показывается на главной странице</p>' +
        '<form id="profileForm" class="form">' +
          '<label class="field"><span>ФИО</span><input name="student" value="' + esc(s.student) + '" required maxlength="60"></label>' +
          '<label class="field"><span>Курс / группа</span><input name="group" value="' + esc(s.group || '') + '" maxlength="40" placeholder="Например: 2 курс, группа ИС-21"></label>' +
          '<div class="form-actions"><button class="btn btn-primary" type="submit">Сохранить</button></div>' +
        '</form>' +
      '</section>' +

      '<section class="card">' +
        '<h3 class="card-title">Тема оформления</h3>' +
        '<p class="card-sub">Светлая бело-зелёная или тёмная чёрно-белая</p>' +
        '<div class="theme-options">' + themeCards + '</div>' +
      '</section>' +

      '<section class="card card-wide">' +
        '<h3 class="card-title">Предметы за ' + currentSemester().label.toLowerCase() + '</h3>' +
        '<p class="card-sub">' + subjectsForSettings.length + ' ' + plural(subjectsForSettings.length, ['предмет', 'предмета', 'предметов']) +
          ' · часы и форма аттестации выбранного семестра</p>' +
        '<div class="subject-manage-list">' + subjectRows + '</div>' +
        '<form id="subjectForm" class="subject-form">' +
          '<input name="name" placeholder="Название предмета" required maxlength="80" aria-label="Название предмета">' +
          '<button class="btn btn-ghost" type="submit">' + icon('plus') + ' Добавить</button>' +
        '</form>' +
        '<p class="settings-note">Удаление предмета также удалит его оценки, зачёты и экзамены. ' +
          'Новый предмет без часов появится в обоих семестрах после добавления оценки.</p>' +
      '</section>' +
    '</div>';
}

const VIEWS = {
  today: renderToday,
  grades: renderGrades,
  semester: renderSemester,
  settings: renderSettings
};

/* ---------- Отрисовка ---------- */

function applyTheme() {
  const choice = state.settings.theme || 'system';
  const effective = choice === 'system' ? (mq.matches ? 'dark' : 'light') : choice;

    document.documentElement.dataset.theme = effective;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.background = 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#080808' : '#15803d');

  document.querySelectorAll('[data-theme-value]').forEach(function (btn) {
    const active = btn.dataset.themeValue === choice;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateChrome() {
  document.getElementById('pageTitle').textContent = PAGE_TITLES[ui.view] || 'Мои оценки';
  document.getElementById('sideName').textContent = shortName();
  document.getElementById('sideGroup').textContent = state.settings.group || 'Студент';
  document.getElementById('userAvatar').textContent = initials();

  const semesterSelect = document.getElementById('semesterSelect');
  if (semesterSelect) semesterSelect.value = String(ui.semester);

  document.querySelectorAll('[data-nav]').forEach(function (btn) {
    const active = btn.dataset.nav === ui.view;
    btn.classList.toggle('is-active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

function render() {
  const root = document.getElementById('view');
  root.innerHTML = (VIEWS[ui.view] || VIEWS.today)();
  updateChrome();
  applyTheme();
  afterRender();
}

/* ---------- Обработчики форм на страницах ---------- */

function afterRender() {
  const root = document.getElementById('view');

  const filterSubject = root.querySelector('#filterSubject');
  if (filterSubject) {
    filterSubject.addEventListener('change', function () {
      ui.subject = filterSubject.value;
      render();
    });
  }

  const filterPeriod = root.querySelector('#filterPeriod');
  if (filterPeriod) {
    filterPeriod.addEventListener('change', function () {
      ui.period = filterPeriod.value;
      render();
    });
  }

  const gradeDay = root.querySelector('#gradeDay');
  if (gradeDay) {
    gradeDay.addEventListener('change', function () {
      ui.day = gradeDay.value || todayISO();
      render();
    });
  }

  const profileForm = root.querySelector('#profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const fd = new FormData(profileForm);
      const student = String(fd.get('student') || '').trim();
      if (!student) {
        toast('Введите ФИО', 'error');
        return;
      }
      state.settings.student = student;
      state.settings.group = String(fd.get('group') || '').trim();
      saveState();
      render();
      toast('Профиль сохранён');
    });
  }

  const subjectForm = root.querySelector('#subjectForm');
  if (subjectForm) {
    subjectForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const fd = new FormData(subjectForm);
      const name = String(fd.get('name') || '').trim();

      if (!name) {
        toast('Введите название предмета', 'error');
        return;
      }
      if (state.subjects.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) {
        toast('Такой предмет уже есть', 'error');
        return;
      }

      state.subjects.push({
        id: uid(),
        name: name,
        color: PALETTE[state.subjects.length % PALETTE.length],
        hours: { 1: 0, 2: 0 },
        attestation: { 1: null, 2: null }
      });
      saveState();
      render();
      toast('Предмет добавлен');
    });
  }
}

/* ---------- Модальные окна ---------- */

function openModal(options) {
  const root = document.getElementById('modal-root');
  root.innerHTML = '' +
    '<div class="modal-backdrop">' +
      '<div class="modal' + (options.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
        '<div class="modal-head">' +
          '<div><h2 id="modalTitle">' + options.title + '</h2>' +
            (options.subtitle ? '<p>' + options.subtitle + '</p>' : '') + '</div>' +
          '<button class="icon-btn" type="button" data-action="close-modal" aria-label="Закрыть">' + icon('close') + '</button>' +
        '</div>' +
        '<div class="modal-body">' + options.body + '</div>' +
      '</div>' +
    '</div>';

  document.body.classList.add('modal-open');

  const backdrop = root.querySelector('.modal-backdrop');
  backdrop.addEventListener('mousedown', function (event) {
    if (event.target === backdrop) closeModal();
  });

  const firstField = root.querySelector('input:not([type="hidden"]), select, textarea');
  if (firstField) {
    setTimeout(function () { firstField.focus(); }, 40);
  }

  return root;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.body.classList.remove('modal-open');
}

function confirmDialog(options) {
  const root = openModal({
    title: options.title,
    body: '<p class="modal-text">' + options.text + '</p>' +
      '<div class="modal-actions">' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-ghost" data-action="close-modal">Отмена</button>' +
        '<button type="button" class="btn ' + (options.danger === false ? 'btn-primary' : 'btn-danger') + '" id="confirmAction">' +
          (options.confirmText || 'Удалить') +
        '</button>' +
      '</div>'
  });

  root.querySelector('#confirmAction').addEventListener('click', function () {
    closeModal();
    options.onConfirm();
  });
}

function openGradeModal(grade) {
  const availableSubjects = semesterSubjects().slice();
  if (grade) {
    const existingSubject = getSubject(grade.subjectId);
    if (existingSubject && !availableSubjects.some(function (subject) { return subject.id === existingSubject.id; })) {
      availableSubjects.push(existingSubject);
    }
  }

  if (!availableSubjects.length) {
    toast('В выбранном семестре нет предметов', 'error');
    return;
  }

  const editing = !!grade;
  const g = grade || {
    subjectId: availableSubjects[0].id,
    date: defaultDateForSemester(),
    type: 'lesson',
    value: 5,
    weight: 1,
    comment: ''
  };

  const typeOptions = Object.keys(GRADE_TYPES).map(function (key) {
    return '<option value="' + key + '"' + (g.type === key ? ' selected' : '') + '>' + GRADE_TYPES[key].label + '</option>';
  }).join('');

  const subjectOptions = availableSubjects.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === g.subjectId ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');

  const marks = [5, 4, 3, 2].map(function (value) {
    return '<label class="mark-choice">' +
      '<input type="radio" name="value" value="' + value + '"' + (g.value === value ? ' checked' : '') + '>' +
      markEl(value) +
    '</label>';
  }).join('');

  const root = openModal({
    title: editing ? 'Изменить оценку' : 'Новая оценка',
    subtitle: editing ? 'Отредактируйте данные оценки' : 'Оценка сразу попадёт в журнал и в итоги семестра',
    body: '' +
      '<form id="gradeForm" class="form">' +
        '<div class="field-row">' +
          '<label class="field"><span>Предмет</span><select name="subjectId">' + subjectOptions + '</select></label>' +
          '<label class="field"><span>Дата</span><input type="date" name="date" value="' + g.date + '" required></label>' +
        '</div>' +
        '<div class="field-row">' +
          '<label class="field"><span>Тип работы</span><select name="type">' + typeOptions + '</select></label>' +
          '<label class="field"><span>Вес оценки</span><input type="number" name="weight" min="1" max="5" step="1" value="' + gradeWeight(g) + '"></label>' +
        '</div>' +
        '<div class="field">' +
          '<span>Оценка</span>' +
          '<div class="mark-picker">' + marks + '</div>' +
        '</div>' +
        '<label class="field"><span>Комментарий <em>необязательно</em></span>' +
          '<input type="text" name="comment" maxlength="80" value="' + esc(g.comment || '') + '" placeholder="Например: контрольная за I четверть"></label>' +
        '<div class="modal-actions">' +
          (editing ? '<button type="button" class="btn btn-danger-ghost" data-action="delete-grade" data-id="' + esc(g.id) + '">' + icon('trash') + ' Удалить</button>' : '') +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">Отмена</button>' +
          '<button type="submit" class="btn btn-primary">' + (editing ? 'Сохранить' : 'Добавить') + '</button>' +
        '</div>' +
      '</form>'
  });

  const form = root.querySelector('#gradeForm');
  const typeSelect = form.querySelector('[name="type"]');
  const weightInput = form.querySelector('[name="weight"]');

  typeSelect.addEventListener('change', function () {
    weightInput.value = GRADE_TYPES[typeSelect.value].weight;
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const fd = new FormData(form);
    const value = Number(fd.get('value'));

    if (!value) {
      toast('Выберите оценку', 'error');
      return;
    }

    const data = {
      subjectId: String(fd.get('subjectId')),
      date: String(fd.get('date')),
      type: String(fd.get('type')),
      weight: Math.max(1, Math.min(5, Number(fd.get('weight')) || 1)),
      value: value,
      comment: String(fd.get('comment') || '').trim()
    };

    if (editing) {
      Object.assign(grade, data);
      toast('Оценка обновлена');
    } else {
      state.grades.push(Object.assign({ id: uid() }, data));
      toast('Оценка добавлена');
    }

    saveState();
    closeModal();
    render();
  });
}

function openAssessmentModal(subjectId, semesterId) {
  const subject = getSubject(subjectId);
  if (!subject) return;

  const semester = semesterById(semesterId || ui.semester);
  const form = subject.attestation[semester.id];

  if (!form) {
    toast('В этом семестре по предмету нет зачёта или экзамена', 'error');
    return;
  }

  const existing = assessmentFor(subject.id, semester.id);
  const today = todayISO();
  const defaultDate = today >= semester.start && today <= semester.end ? today : semester.end;
  const record = existing || { value: 5, date: defaultDate, comment: '' };

  const marks = [5, 4, 3, 2].map(function (value) {
    return '<label class="mark-choice">' +
      '<input type="radio" name="value" value="' + value + '"' + (record.value === value ? ' checked' : '') + '>' +
      markEl(value) +
    '</label>';
  }).join('');

  const root = openModal({
    title: existing ? 'Изменить оценку за аттестацию' : (form === 'exam' ? 'Оценка за экзамен' : 'Оценка за зачёт'),
    subtitle: esc(subject.name) + ' · ' + attestationLabel(form) + ' · ' + semester.label,
    body: '' +
      '<form id="assessmentForm" class="form">' +
        '<label class="field"><span>Дата получения оценки</span>' +
          '<input type="date" name="date" value="' + esc(record.date || defaultDate) + '" required></label>' +
        '<div class="field">' +
          '<span>Оценка</span>' +
          '<div class="mark-picker">' + marks + '</div>' +
        '</div>' +
        '<label class="field"><span>Комментарий <em>необязательно</em></span>' +
          '<input type="text" name="comment" maxlength="80" value="' + esc(record.comment || '') + '" placeholder="Например: оценка в зачётке"></label>' +
        '<div class="modal-actions">' +
          (existing ? '<button type="button" class="btn btn-danger-ghost" data-action="delete-assessment" data-id="' +
            esc(subject.id) + '" data-semester="' + semester.id + '">' + icon('trash') + ' Удалить</button>' : '') +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">Отмена</button>' +
          '<button type="submit" class="btn btn-primary">' + (existing ? 'Сохранить' : 'Поставить') + '</button>' +
        '</div>' +
      '</form>'
  });

  const formEl = root.querySelector('#assessmentForm');
  formEl.addEventListener('submit', function (event) {
    event.preventDefault();
    const fd = new FormData(formEl);
    const value = Number(fd.get('value'));
    const date = String(fd.get('date') || '');

    if (!value) {
      toast('Выберите оценку', 'error');
      return;
    }
    if (!date) {
      toast('Укажите дату', 'error');
      return;
    }

    if (!state.assessments[subject.id]) state.assessments[subject.id] = {};
    state.assessments[subject.id][semester.id] = {
      value: value,
      date: date,
      comment: String(fd.get('comment') || '').trim()
    };

    saveState();
    closeModal();
    render();
    toast(form === 'exam' ? 'Оценка за экзамен сохранена' : 'Оценка за зачёт сохранена');
  });
}

/* ---------- Действия ---------- */

function setTheme(value) {
  state.settings.theme = value;
  saveState();
  applyTheme();
  render();
  const names = { light: 'Светлая тема', dark: 'Тёмная тема', system: 'Тема как в системе' };
  toast(names[value] || 'Тема изменена');
}

function requestDeleteGrade(id) {
  const grade = state.grades.find(function (g) { return g.id === id; });
  if (!grade) return;

  const subject = getSubject(grade.subjectId);
  confirmDialog({
    title: 'Удалить оценку?',
    text: 'Оценка <b>' + grade.value + '</b> по предмету «' + esc(subject ? subject.name : '—') + '» от ' +
      formatDate(grade.date) + ' будет удалена.',
    onConfirm: function () {
      state.grades = state.grades.filter(function (g) { return g.id !== id; });
      saveState();
      render();
      toast('Оценка удалена');
    }
  });
}

function requestDeleteAssessment(subjectId, semesterId) {
  const subject = getSubject(subjectId);
  const semester = semesterById(semesterId);
  const record = assessmentFor(subjectId, semester.id);
  if (!subject || !record) return;

  const form = subject.attestation[semester.id];
  confirmDialog({
    title: 'Удалить оценку за аттестацию?',
    text: 'Оценка <b>' + record.value + '</b> за ' + (form === 'exam' ? 'экзамен' : 'зачёт') +
      ' по предмету «' + esc(subject.name) + '»' +
      (record.date ? ' от ' + formatDate(record.date) : '') + ' будет удалена.',
    onConfirm: function () {
      delete state.assessments[subjectId][semester.id];
      if (!Object.keys(state.assessments[subjectId]).length) delete state.assessments[subjectId];
      saveState();
      closeModal();
      render();
      toast('Оценка за аттестацию удалена');
    }
  });
}

function requestDeleteSubject(id) {
  const subject = getSubject(id);
  if (!subject) return;

  const count = state.grades.filter(function (g) { return g.subjectId === id; }).length;
  confirmDialog({
    title: 'Удалить предмет?',
    text: 'Предмет «' + esc(subject.name) + '» и ' + count + ' ' + plural(count, ['оценка', 'оценки', 'оценок']) +
      ' будут удалены. Зачёты и экзамены по этому предмету тоже исчезнут.',
    onConfirm: function () {
      state.subjects = state.subjects.filter(function (s) { return s.id !== id; });
      state.grades = state.grades.filter(function (g) { return g.subjectId !== id; });
      delete state.assessments[id];
      if (ui.subject === id) ui.subject = 'all';
      saveState();
      render();
      toast('Предмет удалён');
    }
  });
}

/* ---------- Тосты ---------- */

function toast(message, type) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;

  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  el.innerHTML = '<span class="toast-icon">' + icon(type === 'error' ? 'close' : 'check') + '</span>' +
    '<span>' + esc(message) + '</span>';
  wrap.appendChild(el);

  setTimeout(function () {
    el.classList.add('is-out');
    setTimeout(function () { el.remove(); }, 260);
  }, 2800);
}

/* ---------- Глобальные события ---------- */

document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'nav': {
      const nextView = target.dataset.view;
      if (nextView && ui.view !== nextView) {
        ui.view = nextView;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      break;
    }
    case 'theme':
      setTheme(target.dataset.themeValue);
      break;
    case 'add-grade':
      openGradeModal();
      break;
    case 'edit-grade': {
      const grade = state.grades.find(function (g) { return g.id === target.dataset.id; });
      if (grade) openGradeModal(grade);
      break;
    }
    case 'delete-grade':
      requestDeleteGrade(target.dataset.id);
      break;
    case 'edit-assessment':
      openAssessmentModal(target.dataset.id, Number(target.dataset.semester) || ui.semester);
      break;
    case 'delete-assessment':
      requestDeleteAssessment(target.dataset.id, Number(target.dataset.semester) || ui.semester);
      break;
    case 'delete-subject':
      requestDeleteSubject(target.dataset.id);
      break;
    case 'filter-subject':
      ui.subject = target.dataset.id;
      render();
      break;
    case 'day-shift':
      ui.day = addDays(ui.day || todayISO(), Number(target.dataset.delta) || 0);
      render();
      break;
    case 'day-today':
      ui.day = todayISO();
      render();
      break;
    case 'close-modal':
      closeModal();
      break;
  }
});

document.addEventListener('change', function (event) {
  const target = event.target;
  if (target && target.id === 'semesterSelect') {
    ui.semester = Number(target.value) === 2 ? 2 : 1;
    const semester = semesterById(ui.semester);
    const today = todayISO();
    ui.day = today >= semester.start && today <= semester.end ? today : semester.start;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeModal();
});

if (mq.addEventListener) {
  mq.addEventListener('change', function () {
    if (state.settings.theme === 'system') applyTheme();
  });
} else if (mq.addListener) {
  mq.addListener(function () {
    if (state.settings.theme === 'system') applyTheme();
  });
}

/* ---------- Запуск ---------- */

render();
