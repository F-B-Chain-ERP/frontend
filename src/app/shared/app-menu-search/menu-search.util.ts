import { SidebarGroup } from '../../layouts/sidebar/sidebar.model';

export interface FlatMenuItem {
  id: string;
  title: string;
  route: string;
  breadcrumb: string;
  authorities?: string[];
  searchKey: string;
}

interface MenuNode {
  id: string;
  title: string;
  route?: string;
  authorities?: string[];
  children?: MenuNode[];
}

export function normalizeVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function flattenSidebarMenu(groups: SidebarGroup[]): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];

  const walk = (items: MenuNode[], trail: string[]): void => {
    for (const item of items) {
      const path = [...trail, item.title];

      if (item.route) {
        result.push({
          id: item.id,
          title: item.title,
          route: item.route,
          breadcrumb: path.join(' › '),
          authorities: item.authorities,
          searchKey: normalizeVi(path.join(' ')),
        });
      }

      if (item.children?.length) {
        walk(item.children, path);
      }
    }
  };

  for (const group of groups) {
    walk(group.items as unknown as MenuNode[], []);
  }
  return result;
}
