import { FileCode2, FileJson, FileText, type LucideProps } from "lucide-react";

const EXT_META: Record<string, { color: string; Icon: React.ComponentType<LucideProps> }> = {
  go: { color: "#00ADD8", Icon: FileCode2 },
  ts: { color: "#3178c6", Icon: FileCode2 },
  tsx: { color: "#54b9ff", Icon: FileCode2 },
  js: { color: "#f0db4f", Icon: FileCode2 },
  json: { color: "#cbcb41", Icon: FileJson },
  md: { color: "#519aba", Icon: FileText },
};

export function FileIcon({ name, size = 16 }: { name: string; size?: number }) {
  const ext = name.split(".").pop() ?? "";
  const meta = EXT_META[ext] ?? { color: "#858585", Icon: FileText };
  const { color, Icon } = meta;
  return <Icon size={size} style={{ color }} strokeWidth={1.6} />;
}
