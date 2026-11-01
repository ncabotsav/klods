import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv.ts";

test("lit un CSV Rebrickable avec guillemets et virgules dans les noms", () => {
  const csv = 'set_num,name,year,theme_id,num_parts,img_url\r\n8094-1,"Control Centre, Technic",1990,1,"500",x\r\n6034-1,"Black Monarch\'s ""Ghost""",1990,186,30,y\r\n';
  assert.deepEqual(parseCsv(csv), [
    { set_num: "8094-1", name: "Control Centre, Technic", year: "1990", theme_id: "1", num_parts: "500", img_url: "x" },
    { set_num: "6034-1", name: 'Black Monarch\'s "Ghost"', year: "1990", theme_id: "186", num_parts: "30", img_url: "y" },
  ]);
});
