import { countPossibleSecrets } from './core/count.js';
import { generateSecret } from './core/generate.js';
import { isValidGuess } from './core/guess.js';
import { createDigitValidator, DIGITS } from './core/validator.js';
import { addRecord, createGame, parseRecords, submitGuess, } from './core/state.js';
const el = (tag, className = '', text = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
};
const append = (parent, ...children) => {
    parent.append(...children);
    return parent;
};
const storageKey = 'bulls-and-cows:records:v1';
const bases = [
    { value: 2, name: 'BIN', label: 'Двоичная' },
    { value: 8, name: 'OCT', label: 'Восьмеричная' },
    { value: 10, name: 'DEC', label: 'Десятичная' },
    { value: 16, name: 'HEX', label: 'Шестнадцатеричная' },
];
let settings = { length: 4, base: 10 };
let game = null;
let storageWarning = '';
const readRecords = () => {
    try {
        return parseRecords(localStorage.getItem(storageKey));
    }
    catch {
        storageWarning =
            'Хранилище недоступно: рекорды сохранятся только до закрытия страницы.';
        return [];
    }
};
let records = readRecords();
let timerNode = null;
const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const baseName = (base) => bases.find((item) => item.value === base)?.name ?? String(base);
const root = el('div', 'app');
document.body.append(root);
const renderSettings = () => {
    const panel = el('section', 'panel settings-panel');
    append(panel, el('p', 'eyebrow', '01 — НАСТРОЙКА РАУНДА'), el('h2', '', 'Выберите сложность'));
    const form = el('form');
    const baseLabel = el('label', 'field-label', 'Система счисления');
    const baseSelect = el('select');
    baseSelect.id = 'base';
    baseLabel.htmlFor = baseSelect.id;
    bases.forEach((base) => {
        const option = el('option', '', `${base.name} — ${base.label}`);
        option.value = String(base.value);
        option.selected = base.value === settings.base;
        baseSelect.append(option);
    });
    baseSelect.disabled = game !== null;
    baseSelect.addEventListener('change', () => {
        settings = {
            ...settings,
            base: Number(baseSelect.value),
            length: Math.min(settings.length, Number(baseSelect.value)),
        };
        render();
        document.getElementById('base')?.focus();
    });
    const lengthLabel = el('label', 'field-label', 'Длина секрета');
    const lengthSelect = el('select');
    lengthSelect.id = 'length';
    lengthLabel.htmlFor = lengthSelect.id;
    [2, 3, 4, 5, 6].forEach((length) => {
        const option = el('option', '', `${length} ${length < 5 ? 'цифры' : 'цифр'}`);
        option.value = String(length);
        option.disabled = length > settings.base;
        option.selected = length === settings.length;
        lengthSelect.append(option);
    });
    lengthSelect.disabled = game !== null;
    lengthSelect.addEventListener('change', () => {
        settings = { ...settings, length: Number(lengthSelect.value) };
        render();
        document.getElementById('length')?.focus();
    });
    append(form, baseLabel, baseSelect, lengthLabel, lengthSelect);
    const possibility = append(el('div', 'possibility'), el('strong', 'mono', countPossibleSecrets(settings.length, settings.base).toLocaleString('ru-RU')), el('span', '', 'возможных комбинаций'));
    const start = el('button', 'primary', game ? 'Раунд начат' : 'Начать игру →');
    start.type = 'submit';
    start.disabled = game !== null;
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (game)
            return;
        game = createGame(settings, generateSecret(settings.length, settings.base), Date.now());
        render();
        document.getElementById('guess')?.focus();
    });
    append(form, possibility, start);
    append(panel, form, el('p', 'small muted', game
        ? 'Параметры зафиксированы до новой игры.'
        : 'Цифры не повторяются. Секрет может начинаться с нуля.'));
    return panel;
};
const renderGame = () => {
    const panel = el('section', 'panel game-panel');
    const heading = append(el('div', 'section-top'), el('p', 'eyebrow', 'СЕКРЕТНЫЙ КОД'), el('span', `status ${game?.status === 'won' ? 'won' : ''}`, game?.status === 'won'
        ? '● Угадано'
        : game
            ? '● Игра идёт'
            : '○ Готовы к игре'));
    const title = el('h2', '', game?.status === 'won'
        ? 'Есть контакт. Код раскрыт!'
        : 'Что скрывается за цифрами?');
    append(panel, heading, title);
    const slots = el('div', 'secret-slots');
    Array.from({ length: settings.length }, (_, index) => {
        slots.append(el('span', `secret-slot mono ${game?.status === 'won' ? 'revealed' : ''}`, game?.status === 'won' ? game.secret[index].toUpperCase() : '?'));
    });
    slots.setAttribute('aria-label', game?.status === 'won'
        ? `Секрет ${game.secret}`
        : `Секрет из ${settings.length} цифр`);
    panel.append(slots);
    const stats = el('div', 'stats');
    const attempts = append(el('div'), el('span', 'small muted', 'ПОПЫТКИ'), el('strong', 'mono', String(game?.history.length ?? 0).padStart(2, '0')));
    timerNode = el('strong', 'mono', formatTime(game?.elapsedMs ?? 0));
    append(stats, attempts, append(el('div'), el('span', 'small muted', 'ВРЕМЯ'), timerNode));
    panel.append(stats);
    if (!game)
        panel.append(el('p', 'intro muted', 'Настройте раунд и начните игру. После каждой попытки подсказки приблизят вас к ответу.'));
    else if (game.status === 'won') {
        const success = el('div', 'success');
        success.setAttribute('role', 'status');
        append(success, el('strong', '', 'Победа!'), el('p', '', `${game.history.length} попыток · ${formatTime(game.elapsedMs)} · результат добавлен в рекорды.`));
        panel.append(success);
    }
    else {
        const form = el('form', 'guess-form');
        const label = el('label', 'field-label', 'Ваша комбинация');
        label.htmlFor = 'guess';
        const input = el('input', 'mono');
        input.id = 'guess';
        input.type = 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.maxLength = settings.length;
        input.placeholder = DIGITS.slice(0, settings.length);
        input.inputMode = settings.base === 16 ? 'text' : 'numeric';
        input.setAttribute('aria-describedby', 'guess-help guess-error');
        const validDigit = createDigitValidator(settings.base);
        const error = el('p', 'error');
        error.id = 'guess-error';
        error.setAttribute('role', 'alert');
        input.addEventListener('beforeinput', (event) => {
            if (event.data && ![...event.data].every(validDigit))
                event.preventDefault();
        });
        input.addEventListener('input', () => {
            input.value = [...input.value.toLowerCase()]
                .filter(validDigit)
                .join('')
                .slice(0, settings.length);
            error.textContent = '';
            input.removeAttribute('aria-invalid');
        });
        const button = el('button', 'primary', 'Проверить ↵');
        button.type = 'submit';
        const help = el('p', 'small muted', `${settings.length} уникальных цифр · ${DIGITS.slice(0, settings.base).toUpperCase()}`);
        help.id = 'guess-help';
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!game)
                return;
            if (!isValidGuess(input.value, settings.length, settings.base)) {
                error.textContent = `Введите ${settings.length} разных цифр из выбранной системы.`;
                input.setAttribute('aria-invalid', 'true');
                return;
            }
            const next = submitGuess(game, input.value, Date.now());
            if (next === game) {
                error.textContent =
                    'Эта комбинация уже есть в истории. Попробуйте другую.';
                return;
            }
            game = next;
            if (game.status === 'won') {
                records = addRecord(records, {
                    ...game.settings,
                    attempts: game.history.length,
                    elapsedMs: game.elapsedMs,
                    date: new Date().toISOString(),
                });
                try {
                    localStorage.setItem(storageKey, JSON.stringify(records));
                }
                catch {
                    storageWarning =
                        'Не удалось сохранить рекорд. Он доступен до закрытия страницы.';
                }
            }
            render();
            document
                .getElementById(game.status === 'won' ? 'new-game' : 'guess')
                ?.focus();
        });
        append(form, label, append(el('div', 'input-row'), input, button), help, error);
        panel.append(form);
    }
    if (game) {
        const reset = el('button', 'text-button', '↻ Новая игра');
        reset.id = 'new-game';
        reset.type = 'button';
        reset.addEventListener('click', () => {
            game = null;
            render();
            document.getElementById('base')?.focus();
        });
        panel.append(reset);
    }
    return panel;
};
const renderHistory = () => {
    const panel = el('section', 'panel history-panel');
    append(panel, append(el('div', 'section-top'), el('h2', '', 'История попыток'), el('span', 'badge', String(game?.history.length ?? 0))));
    const region = el('div');
    region.setAttribute('aria-live', 'polite');
    if (!game?.history.length)
        append(region, el('div', 'empty', 'Пока ни одной версии. Введите комбинацию — и здесь появится первая зацепка.'));
    else {
        const table = el('table');
        const header = el('tr');
        ['№', 'Комбинация', 'Быки', 'Коровы'].forEach((text) => {
            const cell = el('th', '', text);
            cell.scope = 'col';
            header.append(cell);
        });
        const body = el('tbody');
        game.history.forEach((entry, index) => {
            const row = el('tr');
            append(row, el('td', 'muted mono', String(index + 1).padStart(2, '0')), el('td', 'guess-number mono', entry.guess.toUpperCase()), el('td', 'bull-count', String(entry.bulls)), el('td', 'cow-count', String(entry.cows)));
            body.append(row);
        });
        append(table, append(el('thead'), header), body);
        region.append(table);
    }
    panel.append(region);
    return panel;
};
const renderRecords = () => {
    const panel = el('section', 'panel records-panel');
    append(panel, append(el('div', 'section-top'), el('h2', '', 'Личные рекорды'), el('span', 'badge', 'ТОП 10')), el('p', 'small muted', 'Меньше попыток — выше место. Затем решает время.'));
    if (!records.length)
        panel.append(el('div', 'empty', 'Ваше лучшее ещё впереди. Раскройте первый код, чтобы попасть в таблицу.'));
    else {
        const list = el('ol', 'records');
        records.forEach((record, index) => {
            const item = el('li');
            append(item, el('span', 'rank mono', String(index + 1).padStart(2, '0')), append(el('div', 'record-meta'), el('strong', '', `${record.attempts} попыток`), el('span', 'small muted', `${baseName(record.base)} · ${record.length} цифры`)), el('span', 'mono', formatTime(record.elapsedMs)));
            list.append(item);
        });
        panel.append(list);
    }
    if (storageWarning) {
        const warning = el('p', 'small error', storageWarning);
        warning.setAttribute('role', 'status');
        panel.append(warning);
    }
    panel.append(el('p', 'small muted', 'Рекорды хранятся в этом браузере.'));
    return panel;
};
const render = () => {
    const brand = append(el('a', 'brand'), el('span', 'brand-mark', 'B/C'), el('span', 'brand-name', 'bulls & cows'));
    brand.href = '#';
    brand.setAttribute('aria-label', 'Bulls and Cows — начало страницы');
    const header = append(el('header', 'header'), brand, append(el('div', 'header-note'), el('span', 'online-dot'), el('span', '', 'ИГРОВАЯ КОМНАТА'), el('span', 'room-number mono', '№ 001')), el('span', 'header-edition mono', 'МЕНЬШЕ ШУМА. БОЛЬШЕ ЛОГИКИ.'));
    const hero = el('section', 'hero');
    const heroTitle = append(el('h1'), el('span', '', 'ЛОМАЙ КОД.'), el('span', 'title-outline', 'НЕ ГОЛОВУ.'));
    const heroCopy = append(el('div', 'hero-content'), el('p', 'eyebrow', 'КЛАССИКА ДЕДУКЦИИ / НОВЫЙ УРОВЕНЬ'), heroTitle, el('p', 'hero-copy', 'Один секрет. Уникальные цифры. Только ваша логика и подсказки после каждой попытки.'));
    const artwork = el('div', 'code-art');
    artwork.setAttribute('aria-hidden', 'true');
    append(artwork, el('span', 'art-caption mono', 'DECODE THE UNKNOWN'), el('div', 'art-orbit orbit-one'), el('div', 'art-orbit orbit-two'), el('span', 'art-digit digit-one mono', '0'), el('span', 'art-digit digit-two mono', '1'), el('span', 'art-digit digit-three mono', '?'), el('span', 'art-digit digit-four mono', 'A'), el('span', 'art-cross cross-one', '+'), el('span', 'art-cross cross-two', '+'), el('span', 'art-bottom mono', 'ЛОГИКА > УДАЧА'));
    append(hero, heroCopy, artwork);
    const legend = append(el('div', 'legend'), append(el('div', 'legend-title'), el('span', 'eyebrow', 'КАК ЧИТАТЬ ПОДСКАЗКИ'), el('span', 'legend-arrow', '↗')), append(el('div', 'legend-item'), el('span', 'legend-icon bull-count', '●'), el('strong', '', 'Бык'), el('span', '', 'Верная цифра. Верное место.')), append(el('div', 'legend-item'), el('span', 'legend-icon cow-count', '○'), el('strong', '', 'Корова'), el('span', '', 'Верная цифра. Другое место.')));
    const main = append(el('main', 'layout'), renderSettings(), renderGame(), renderHistory(), renderRecords());
    const footer = append(el('footer'), el('span', '', 'B/C — маленькая игра для больших открытий.'), el('span', 'mono', 'БЕЗ ЛИМИТА ПОПЫТОК / БЕЗ СПЕШКИ'));
    root.replaceChildren(header, hero, legend, main, footer);
};
setInterval(() => {
    if (game?.status === 'playing' && timerNode)
        timerNode.textContent = formatTime(Math.max(0, Date.now() - game.startedAt));
}, 250);
render();
