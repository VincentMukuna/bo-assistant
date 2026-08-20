import { expect, test } from "bun:test";
import Database = require(".");

test("adapts Bun SQLite statements to Knex's better-sqlite3 contract", () => {
  using database = new Database(":memory:");
  database.exec("create table contacts (id integer primary key, name text not null)");

  const insert = database.prepare("insert into contacts (name) values (?)");
  expect(insert.reader).toBe(false);
  expect(insert.run(["Alice"])).toMatchObject({ changes: 1, lastInsertRowid: 1 });

  const select = database.prepare<{ id: number; name: string }>("select id, name from contacts");
  expect(select.reader).toBe(true);
  expect(select.all([])).toEqual([{ id: 1, name: "Alice" }]);

  database.exec(
    "create table notes (id integer primary key, contact_id integer references contacts(id) on delete cascade)"
  );
  database.prepare("insert into notes (contact_id) values (?)").run([1]);
  database.prepare("delete from contacts where id = ?").run([1]);
  expect(database.prepare("select * from notes").all([])).toEqual([]);
});
