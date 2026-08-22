import {inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, catchError, map, of} from 'rxjs';
import {FULL_PERMISSION} from '../config/functions.constants';

export interface IFunction {
  FunctionsId: number;
  ApplicationId: number;
  ParentId: number;
  FunctionsName: string;
  Path: string;
  FunctionUrl: string;
  Icon: string | null;
  Flag: number;
  OrderId: number;
  OnMenu: number;
  IsSystem: number;
  Level: number;
  Adds: number;
  Del: number;
  Edit: number;
  Res: number;
}

@Injectable({providedIn: 'root'})
export class PermissionService {
  private readonly http = inject(HttpClient);
  private readonly _functions = signal<IFunction[]>([]);
  private readonly API = "local";
  readonly functions = this._functions.asReadonly();

  loadFunctions(roleId: number | string, isFullPermission = false): Observable<string[]> {
    if (isFullPermission) {
      return of([FULL_PERMISSION]);
    }
    return this.http
      .get<{ Data: IFunction[]; Success: boolean }>(`${this.API}/api/v1.0/Role/GetFunction_Permission`, {
        params: {ApplicationId: '17', GroupId: String(roleId), Keyword: ''},
      })
      .pipe(
        map(res => {
          const functions = res.Success && res.Data ? res.Data : [];
          this._functions.set(functions);
          return this.toAuthorities(functions);
        }),
        catchError(() => of([])),
      );
  }

  clear(): void {
    this._functions.set([]);
  }

  private toAuthorities(functions: IFunction[]): string[] {
    const result: string[] = [];
    for (const f of functions) {
      const hasAnyPermission = f.Flag || f.Adds || f.Edit || f.Del;
      if (!hasAnyPermission) continue;

      result.push(`F${f.FunctionsId}`);
      if (f.Flag) result.push(`F${f.FunctionsId}_VIEW`);
      if (f.Adds) result.push(`F${f.FunctionsId}_ADD`);
      if (f.Edit) result.push(`F${f.FunctionsId}_EDIT`);
      if (f.Del) result.push(`F${f.FunctionsId}_DEL`);
    }
    return result;
  }
}
