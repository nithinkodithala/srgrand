# 🍽 Sr Grand Hotel Grand Multi Cuisine Restaurant — Website

A complete, mobile-friendly restaurant ordering website with a full **Owner Dashboard**.
Built with plain HTML, CSS & JavaScript — **no installation, no server, no internet required to run**. Just open the file.

---

## 🚀 How to Run

1. Double-click **`index.html`** → opens the customer website.
2. To open the owner panel: scroll to the footer → **Owner Login**, or open **`admin.html`** directly.

---

## ☁️ IMPORTANT — Enable Cross-Device Sync (Firebase)

Because the site is **deployed on Vercel**, you MUST connect a shared database,
otherwise **orders placed by customers will NOT appear in the owner dashboard**
(they'd be stuck on the customer's own phone), and owner menu/special changes
won't reach customers on other devices.

**One-time setup (~5 minutes, free):**
1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Firestore Database → Create database → Start in test mode**.
3. **Project settings (⚙) → Your apps → Web (`</>`) → register** → copy the
   `firebaseConfig` object.
4. Open **`js/db.js`**, find `const FIREBASE_CONFIG = null;` near the top, and
   replace `null` with your copied config object.
5. Save & redeploy to Vercel. Done — orders & menu now sync **live** across every device.

> Until you do this, the site still works on a **single device** using the browser's
> local storage (fine for testing). A green ✓ message appears in the browser console
> once cloud sync is active.

---

## 🔑 Owner Login (change these in `.env` and `config.js`)

| Field | Value |
|-------|-------|
| Email | `admin@srgrandhotel.com` |
| Password | `chalukya@2024` |

---

## ⚙️ IMPORTANT — Fill in your real details

Open **`.env`** AND **`config.js`** and replace the placeholder values with the real ones.
Both files must match. `config.js` is what the website actually reads (a browser cannot read `.env` directly).

```
RESTAURANT_PHONE      = +91XXXXXXXXXX     ← real phone (for Call button)
RESTAURANT_WHATSAPP   = +91XXXXXXXXXX     ← real WhatsApp (orders are sent here!)
RESTAURANT_MAP_URL    = https://maps.google.com/...   ← real Google Maps link
RESTAURANT_ADDRESS    = Full address
OPEN_TIME / CLOSE_TIME = timings
ADMIN_EMAIL / ADMIN_PASSWORD = owner login
```

⚠️ **Orders will only reach you once `RESTAURANT_WHATSAPP` is set to your real number.**

---

## 👨‍🍳 What the OWNER can do (admin.html)

- **📊 Dashboard:** Today's orders, today's revenue, monthly orders, monthly revenue, total orders, most-ordered item, popular category, recent orders.
- **🍔 Manage Items:** Edit, delete, and toggle **Available / Not Available** for any of the 161 dishes. Changes appear instantly on the customer site.
- **➕ Add New Item:** Name, image (upload from phone/PC), price, category, type, serves, spice level, description, and tags.
- **⭐ Daily Specials:** Mark items as **Today's Special** (shows at top of homepage) or **🔥 Best Seller**. Update every morning.
- **📦 Orders:** Full order history with customer name, mobile, address, items, customization, total — filter by Today / Month / All. One-tap "Contact Customer" on WhatsApp.

---

## 🛒 What the CUSTOMER can do (index.html)

- Welcome splash screen → Home with **Today's Specials** + **Best Sellers**.
- Browse **161 dishes** across 6 categories with photos, price, veg/non-veg badge, serves, spice level & description.
- **🔍 Search** any dish + **filter** by Veg / Non-Veg / Best Seller / Special / Category.
- **🌱 Veg Mode** toggle — hides all non-veg & egg items instantly.
- **Customize every item** before adding to cart (Less Spicy, Extra Onion, custom note, etc.).
- Cart → fill name/mobile/address → **order is sent to the owner's WhatsApp** in the exact required format.
- **Thank You** screen → Order Again.
- **Floating buttons:** Call · WhatsApp · Cart · Directions (always visible).
- **Contact section:** tap to Call, WhatsApp, or open Google Maps. Shows live "Open Now / Closed".

---

## ✨ Extra features added (beyond the brief)

1. **Live "Open Now / Closed Now"** status based on your timings.
2. **Spice-level dots** + serves count on every card.
3. **"In Cart ✓"** indicator on buttons so customers see what's already added.
4. **Order analytics** (most-ordered, popular category, revenue) auto-calculated from real orders.
5. **Image upload** for new items (stored in-browser, no hosting needed).
6. **Reset to Default** button so the owner can undo all changes safely.
7. **Session-based login** + welcome splash shows only once per visit (not annoying on every scroll).
8. Fully **responsive** — designed mobile-first for customers ordering on phones.

---

## 📁 File Structure

```
SR GRAND HOTEL -1/
├── index.html          ← Customer website
├── admin.html          ← Owner dashboard
├── config.js           ← Restaurant details (website reads this)
├── .env                ← Restaurant details (reference copy)
├── css/
│   ├── style.css       ← Main styles
│   └── admin.css       ← Dashboard styles
├── js/
│   ├── menuData.js     ← All 161 menu items + data helpers
│   ├── cart.js         ← Cart logic
│   ├── app.js          ← Customer site logic
│   └── admin.js        ← Owner dashboard logic
└── Images/             ← All food photos
```

---

## 💡 Future ideas (optional, for later)

- Online payment (UPI / Razorpay) integration.
- Customer reviews & star ratings per dish.
- SMS/Email order confirmation.
- A real backend (so menu changes sync across all devices, not just one browser).
- Order status tracking (Preparing → Out for delivery → Delivered).
- Coupon / discount codes and loyalty points.
