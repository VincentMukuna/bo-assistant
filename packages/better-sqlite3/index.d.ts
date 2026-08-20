import { Database as BunDatabase, Statement } from "bun:sqlite";

interface DatabaseOptions {
  nativeBinding?: string;
  readonly?: boolean;
}

declare class Database extends BunDatabase {
  constructor(filename?: string, options?: DatabaseOptions);
  prepare<ReturnType = unknown, ParamsType extends unknown[] = unknown[]>(
    sql: string
  ): Statement<ReturnType, ParamsType> & {
    reader: boolean;
    safeIntegers(enabled?: boolean): Statement<ReturnType, ParamsType>;
  };
  defaultSafeIntegers(enabled?: boolean): this;
}

export = Database;
