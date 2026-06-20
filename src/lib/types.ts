import type { LucideIcon } from "lucide-react";

/** A single rendered block inside a "file". */
export type Block =
  | { t: "h1"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "metrics"; items: { label: string; value: string }[] }
  | { t: "tech"; items: string[] }
  | { t: "code"; lang: string; code: string; caption?: string; collapsible?: boolean }
  | { t: "callout"; text: string }
  | { t: "links"; items: { label: string; href: string }[] }
  | { t: "divider" };

export interface FileNode {
  id: string;            // unique path, e.g. "projects/wifi-analyzer.go"
  name: string;          // display name, e.g. "wifi-analyzer.go"
  language: string;      // status-bar language label, e.g. "Go"
  blocks: Block[];       // rendered content
}

export interface FolderNode {
  id: string;
  name: string;
  children: (FolderNode | FileNode)[];
}

export type TreeNode = FolderNode | FileNode;

export function isFolder(node: TreeNode): node is FolderNode {
  return (node as FolderNode).children !== undefined;
}

export interface ActivityItem {
  id: string;
  label: string;
  icon: LucideIcon;
}
