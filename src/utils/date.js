// Datas em horário LOCAL (YYYY-MM-DD). Nunca usar toISOString() para "hoje":
// ele converte para UTC e, no Brasil, depois das 21h já vira o dia seguinte.

const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

// 'YYYY-MM-DD' → Date às 12h locais (meio-dia evita pulos de horário de verão).
export const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (iso, n) => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const formatBR = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// "Hoje", "Ontem" ou "qua, 24/09".
export const friendlyDate = (iso) => {
  const today = todayISO();
  if (iso === today) return 'Hoje';
  if (iso === addDays(today, -1)) return 'Ontem';
  const d = parseISODate(iso);
  return `${WEEKDAYS_LONG_PT[d.getDay()].slice(0, 3)}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

// "quarta-feira, 24 de setembro" (cabeçalho do dia no histórico).
export const longDate = (iso) => {
  const d = parseISODate(iso);
  const wd = WEEKDAYS_LONG_PT[d.getDay()];
  const suffix = d.getDay() === 0 || d.getDay() === 6 ? '' : '-feira';
  return `${wd}${suffix}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()].toLowerCase()}`;
};
