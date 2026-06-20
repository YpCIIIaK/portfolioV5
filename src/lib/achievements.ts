export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string; // emoji
  secret?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "explorer", title: "Исследователь", desc: "Открыть 5 разных файлов", icon: "🧭" },
  { id: "terminal", title: "В терминале", desc: "Открыть встроенный терминал", icon: "💻" },
  { id: "ai", title: "Любопытный", desc: "Задать вопрос AI-ассистенту", icon: "🤖" },
  { id: "live", title: "Live-данные", desc: "Открыть все файлы из папки live/", icon: "🟢" },
  { id: "palette", title: "Командная строка", desc: "Открыть палитру команд (Ctrl+K)", icon: "⌨️" },
  { id: "theme", title: "Дизайнер", desc: "Сменить тему оформления", icon: "🎨" },
  { id: "contact", title: "На связи", desc: "Открыть форму контакта", icon: "📨" },
  { id: "tour", title: "Гид пройден", desc: "Завершить вводный тур", icon: "🎓" },
  { id: "sudo", title: "Nice try", desc: "Попробовать sudo в терминале", icon: "🕵️", secret: true },
  { id: "platinum", title: "Платина", desc: "Открыть все достижения", icon: "🏆" },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
export const NON_META = ACHIEVEMENTS.filter((a) => a.id !== "platinum");
