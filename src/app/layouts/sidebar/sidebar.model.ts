export interface SidebarGroup {
  kind: 'group';
  id: string;
  title: string;
  items: SidebarParent[];
}

export interface SidebarParent {
  kind: 'parent';
  id: string;
  title: string;
  route?: string;
  icon?: string;
  children?: SidebarChild[];
  authorities?: string[];
}

export interface SidebarChild {
  kind: 'child';
  id: string;
  title: string;
  icon?: string;
  route?: string;
  activePrefix?: string;
  authorities?: string[];
  children?: SidebarChild[];
}

export type SidebarItem = SidebarGroup | SidebarParent | SidebarChild;
