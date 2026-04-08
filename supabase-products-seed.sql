-- Replace current product catalog with the app's existing guitar products.
delete from products;

insert into products (name, price, category, image, badge)
values
  ('Nebula Custom ST', 2499, 'electric', 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=600&auto=format&fit=crop', 'New'),
  ('Midnight Telecaster', 1850, 'vintage', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop', ''),
  ('Ivory Acoustic Pro', 3200, 'acoustic', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop', ''),
  ('Obsidian Bass IV', 1650, 'bass', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop', 'New'),
  ('Sunburst 59 Reissue', 4800, 'vintage', 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1200&auto=format&fit=crop', 'Limited'),
  ('Nylon Classic Grand', 2100, 'classical', 'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop', '');
