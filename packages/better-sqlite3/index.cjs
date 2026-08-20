const { Database: BunDatabase } = require("bun:sqlite");

/**
 * Knex's better-sqlite3 dialect only needs a thin compatibility surface over
 * Bun's native SQLite database and statements.
 */
class Database extends BunDatabase {
  constructor(filename, options = {}) {
    const readonly = Boolean(options.readonly);
    super(filename, {
      create: !readonly,
      readonly,
      safeIntegers: false,
    });
    this.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql) {
    const statement = super.prepare(sql);
    statement.reader = statement.columnNames.length > 0;
    statement.safeIntegers = (enabled = true) => {
      if (enabled) {
        throw new Error("Safe integers must be configured when opening a Bun SQLite database");
      }
      return statement;
    };
    return statement;
  }

  defaultSafeIntegers(enabled = true) {
    if (enabled) {
      throw new Error("Safe integers must be configured when opening a Bun SQLite database");
    }
    return this;
  }
}

module.exports = Database;
