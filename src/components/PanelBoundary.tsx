"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** При смене ключа (например, id открытого файла) ошибка сбрасывается —
   *  переключение на другую вкладку не должно показывать чужой краш. */
  resetKey?: string;
}

interface State { error: Error | null }

/**
 * Ограда вокруг панелей-интеграций (почта, Telegram, Notion, Bitrix, Figma…).
 *
 * Каждая панель ходит во внешний сервис, и упавшая интеграция без ограды
 * роняет весь редактор белым экраном. Здесь падение остаётся внутри вкладки:
 * видно, что сломалось, и можно перезапустить панель, не перезагружая сайт.
 */
export class PanelBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="rounded border border-red-500/40 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-red-300">
            <AlertTriangle size={15} />
            Панель упала
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-vsc-muted">
            Остальной сайт работает — сломалось только содержимое этой вкладки.
            Ошибка: <span className="text-vsc-text">{error.message || String(error)}</span>
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover"
          >
            <RotateCcw size={13} />
            Перезапустить панель
          </button>
        </div>
      </div>
    );
  }
}
