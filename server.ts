import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import sendEmailHandler from './api/send-email';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize SQLite Database
const db = new Database('guitar_shop.db');
const brokenMidnightTelecasterImage = 'https://images.unsplash.com/photo-1585672841585-57f4335800a4?q=80&w=1200&auto=format&fit=crop';
const fixedMidnightTelecasterImage = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop';

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    badge TEXT,
    description TEXT,
    specifications TEXT
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    image TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    full_name TEXT,
    address TEXT,
    city TEXT,
    zip_code TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid)
  );
`);

// Seed Products if empty
const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
if (productCount.count === 0) {
  const insertProduct = db.prepare('INSERT INTO products (name, price, category, image, badge, description, specifications) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const seedProducts = [
    [
      "Nebula Custom ST", 
      "$2,499", 
      "electric", 
      "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=600&auto=format&fit=crop", 
      "New",
      "The Nebula Custom ST represents the pinnacle of modern guitar craftsmanship. Featuring a hand-selected alder body and a roasted maple neck, this instrument delivers unparalleled clarity and sustain. The custom-wound 'Stardust' pickups provide a wide range of tones, from crystalline cleans to aggressive lead sounds.",
      JSON.stringify({
        "Body": "Select Alder",
        "Neck": "Roasted Maple, C-Shape",
        "Fingerboard": "Ebony, 12\" Radius",
        "Pickups": "AIO Stardust SSS Set",
        "Bridge": "AIO Pro Tremolo",
        "Finish": "Nebula Burst Gloss"
      })
    ],
    [
      "Midnight Telecaster", 
      "$1,850", 
      "vintage", 
      fixedMidnightTelecasterImage,
      "",
      "A classic reimagined for the night. The Midnight Telecaster combines vintage aesthetics with modern playability. Its ash body is finished in a deep, lustrous black, complemented by gold hardware. The vintage-voiced single coils capture that iconic 'twang' while maintaining a quiet, noise-free operation.",
      JSON.stringify({
        "Body": "Lightweight Ash",
        "Neck": "Maple, U-Shape",
        "Fingerboard": "Maple, 7.25\" Radius",
        "Pickups": "AIO Vintage Night SS Set",
        "Bridge": "3-Saddle Vintage Style",
        "Finish": "Midnight Black"
      })
    ],
    [
      "Ivory Acoustic Pro", 
      "$3,200", 
      "acoustic", 
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop", 
      "",
      "Experience the pure, resonant sound of the Ivory Acoustic Pro. Crafted with a solid Sitka spruce top and solid mahogany back and sides, this guitar offers a rich, balanced tone that only gets better with age. The elegant ivory binding and minimalist design make it a stunning centerpiece for any collection.",
      JSON.stringify({
        "Body Shape": "Dreadnought",
        "Top": "Solid Sitka Spruce",
        "Back/Sides": "Solid Mahogany",
        "Neck": "Mahogany",
        "Electronics": "AIO PureTone Preamp",
        "Finish": "Natural Satin"
      })
    ],
    [
      "Obsidian Bass IV", 
      "$1,650", 
      "bass", 
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop", 
      "New",
      "The Obsidian Bass IV is designed for the modern bassist who demands power and precision. Its active electronics and high-output humbuckers deliver a massive low-end that cuts through any mix. The ergonomic body design ensures comfort during long sessions, while the obsidian finish provides a sleek, professional look.",
      JSON.stringify({
        "Body": "Mahogany",
        "Neck": "Maple/Walnut 5-Piece",
        "Fingerboard": "Rosewood",
        "Pickups": "AIO Obsidian Active Humbuckers",
        "Preamp": "3-Band Active EQ",
        "Finish": "Obsidian Matte"
      })
    ],
    [
      "Sunburst 59 Reissue", 
      "$4,800", 
      "vintage", 
      "https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1200&auto=format&fit=crop", 
      "Limited",
      "A faithful recreation of one of the most sought-after guitars in history. The Sunburst 59 Reissue captures the magic of the original with period-correct hardware, a deep-carved maple top, and a nitrocellulose finish. Every detail, from the neck profile to the pickup windings, has been meticulously researched to provide an authentic vintage experience.",
      JSON.stringify({
        "Body": "Solid Mahogany w/ Flamed Maple Top",
        "Neck": "Mahogany, 50s Profile",
        "Fingerboard": "Rosewood",
        "Pickups": "AIO '59 PAF Replicas",
        "Bridge": "Tune-O-Matic",
        "Finish": "Heritage Sunburst Nitro"
      })
    ],
    [
      "Nylon Classic Grand", 
      "$2,100", 
      "classical", 
      "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop", 
      "",
      "The Nylon Classic Grand is built for the serious classical guitarist. Its traditional fan bracing and solid cedar top produce a warm, expressive tone with excellent projection. The wide nut and flat fingerboard provide the perfect platform for intricate fingerstyle techniques.",
      JSON.stringify({
        "Top": "Solid Western Red Cedar",
        "Back/Sides": "Solid Rosewood",
        "Neck": "Spanish Cedar",
        "Fingerboard": "Ebony",
        "Scale Length": "650mm",
        "Finish": "French Polish"
      })
    ]
  ];
  seedProducts.forEach(p => insertProduct.run(...p));
}

// Patch previously seeded data if it contains a dead image URL.
db.prepare('UPDATE products SET image = ? WHERE name = ? AND image = ?')
  .run(fixedMidnightTelecasterImage, 'Midnight Telecaster', brokenMidnightTelecasterImage);

app.use(cors());
app.use(express.json());

// API Routes

// User Sync
app.post('/api/users/sync', (req, res) => {
  const { uid, email, displayName } = req.body;
  const stmt = db.prepare('INSERT OR IGNORE INTO users (uid, email, display_name) VALUES (?, ?, ?)');
  stmt.run(uid, email, displayName);
  res.json({ success: true });
});

// Get Products
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

// Get Cart
app.get('/api/cart/:userId', (req, res) => {
  const items = db.prepare('SELECT * FROM cart_items WHERE user_id = ?').all(req.params.userId);
  res.json(items);
});

// Add to Cart
app.post('/api/cart', (req, res) => {
  const { userId, productId, name, price, image, category } = req.body;
  
  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId) as any;
  
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, name, price, image, category) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, productId, name, price, image, category);
  }
  res.json({ success: true });
});

// Update Cart Quantity
app.patch('/api/cart/:id', (req, res) => {
  const { quantity } = req.body;
  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  }
  res.json({ success: true });
});

// Remove from Cart
app.delete('/api/cart/:id', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Checkout
app.post('/api/checkout', (req, res) => {
  const { userId, items, total, shippingDetails } = req.body;
  
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, items_json, total, full_name, address, city, zip_code, phone) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertOrder.run(
    userId, 
    JSON.stringify(items), 
    total,
    shippingDetails.fullName,
    shippingDetails.address,
    shippingDetails.city,
    shippingDetails.zipCode,
    shippingDetails.phone
  );
  
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

// Send invoice email with PDF attachment
app.post('/api/send-email', sendEmailHandler);

// Get Orders
app.get('/api/orders/:userId', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
  res.json(orders);
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
