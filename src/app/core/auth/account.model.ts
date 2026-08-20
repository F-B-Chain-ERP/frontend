export interface Organization {
  UserId: number | string;
  OrganizationId: number | string;
  OrganizationName: string;
}

export class Account {
  constructor(
    public activated: boolean,
    public authorities: string[],
    public email: string,
    public firstName: string | null,
    public langKey: string,
    public lastName: string | null,
    public login: string,
    public imageUrl: string | null,
    public organizations: Organization[] = [],
    public currentOrganizationId: string | number | null = null,
    public donViSuDungId?: number,
    public donViSuDungName?: string,
  ) {}
}
