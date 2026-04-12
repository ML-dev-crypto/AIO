alter table products add column if not exists artist text;

update products set artist = 'elena-voss' where id = 7;
update products set artist = 'marcus-steele' where id = 8;
update products set artist = 'priya-anand' where id = 3;
update products set artist = 'dario-ferretti' where id = 4;
update products set artist = 'kira-nomura' where id = 5;
