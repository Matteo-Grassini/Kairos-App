
export const getItalianHoliday = (date: Date): string | null => {
  const d = date.getDate();
  const m = date.getMonth(); // 0-11
  const y = date.getFullYear();

  // Fisse
  if (d === 1 && m === 0) return "Capodanno";
  if (d === 6 && m === 0) return "Epifania";
  if (d === 25 && m === 3) return "Festa della Liberazione";
  if (d === 1 && m === 4) return "Festa dei Lavoratori";
  if (d === 2 && m === 5) return "Festa della Repubblica";
  if (d === 15 && m === 7) return "Ferragosto";
  if (d === 1 && m === 10) return "Ognissanti";
  if (d === 8 && m === 11) return "Immacolata Concezione";
  if (d === 25 && m === 11) return "Natale";
  if (d === 26 && m === 11) return "Santo Stefano";

  // Calcolo Pasqua (Algoritmo di Meeus/Jones/Butcher)
  const f = Math.floor;
  const G = y % 19;
  const C = f(y / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);

  // Pasqua (month è 1-based nell'algoritmo, quindi -1)
  if (m === month - 1 && d === day) return "Pasqua";
  
  // Pasquetta (Giorno dopo Pasqua)
  const easterDate = new Date(y, month - 1, day);
  const pasquettaDate = new Date(easterDate);
  pasquettaDate.setDate(easterDate.getDate() + 1);
  if (m === pasquettaDate.getMonth() && d === pasquettaDate.getDate()) return "Lunedì dell'Angelo";

  return null;
};
