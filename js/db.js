/* =====================================================================
   SHARED DATA LAYER  —  Firebase Firestore  +  localStorage fallback
   ---------------------------------------------------------------------
   WHY THIS EXISTS:
   Your site is deployed (Vercel). localStorage only lives on ONE device,
   so orders placed by customers never reach the owner's dashboard, and
   the owner's menu changes never reach customers on other phones.
   Firestore is a free shared cloud database that fixes all of that
   with real-time sync across every device.

   ---------------------------------------------------------------------
   ONE-TIME SETUP (5 minutes) — do this to enable cross-device sync:
   1. Go to https://console.firebase.google.com  ->  Add project.
   2. Build  ->  Firestore Database  ->  Create database  ->  Start in
      *test mode* (or production with the rules at the bottom of this file).
   3. Project settings (gear icon)  ->  "Your apps"  ->  Web (</>) ->
      register app  ->  copy the firebaseConfig object.
   4. Paste it below replacing FIREBASE_CONFIG = null.
   5. Save, push to Vercel.  Done — orders & menu now sync everywhere.

   If you leave FIREBASE_CONFIG = null, the site still works perfectly on
   a SINGLE device using localStorage (good for testing).
   ===================================================================== */

const FIREBASE_CONFIG = null;
/*  EXAMPLE — replace the line above with your real config:
const FIREBASE_CONFIG = {
  apiKey: "AIza............",
  authDomain: "chalukya-xxxx.firebaseapp.com",
  projectId: "chalukya-xxxx",
  storageBucket: "chalukya-xxxx.appspot.com",
  messagingSenderId: "0000000000",
  appId: "1:0000000000:web:xxxxxxxx"
};
*/

const DB = (function () {
  let fdb = null;
  let useFB = false;
  const listeners = [];

  // In-memory cache = single source of truth for synchronous reads
  const cache = {
    overrides: {},        // { itemId: {price, status, badges, ...} }
    customItems: [],       // owner-added dishes
    customCategories: [],  // owner-added categories e.g. "Cold Drinks"
    orders: []             // customer orders
  };

  function fire() { listeners.forEach(cb => { try { cb(); } catch (e) { console.error(e); } }); }
  function onChange(cb) { listeners.push(cb); }

  // ---------- localStorage helpers ----------
  function loadLocal() {
    try {
      cache.overrides = JSON.parse(localStorage.getItem('menuOverrides') || '{}');
      cache.customItems = JSON.parse(localStorage.getItem('customItems') || '[]');
      cache.customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
      cache.orders = JSON.parse(localStorage.getItem('srgrand_orders') || '[]');
    } catch (e) { console.warn('localStorage read failed', e); }
  }
  function persistLocalMenu() {
    localStorage.setItem('menuOverrides', JSON.stringify(cache.overrides));
    localStorage.setItem('customItems', JSON.stringify(cache.customItems));
    localStorage.setItem('customCategories', JSON.stringify(cache.customCategories));
  }
  function persistLocalOrders() {
    localStorage.setItem('srgrand_orders', JSON.stringify(cache.orders));
  }

  // ---------- init ----------
  function init() {
    loadLocal(); // always have data immediately

    if (FIREBASE_CONFIG && typeof firebase !== 'undefined') {
      try {
        firebase.initializeApp(FIREBASE_CONFIG);
        fdb = firebase.firestore();
        useFB = true;
        subscribeAll();
        console.log('%c✓ Connected to shared cloud database (real-time sync ON)', 'color:green;font-weight:bold');
      } catch (e) {
        useFB = false;
        console.warn('Firebase init failed — running in local-only mode.', e);
      }
    } else {
      console.log('%cℹ Running in LOCAL mode (single device). Add FIREBASE_CONFIG in js/db.js to sync across devices.', 'color:#E07B39');
    }

    // In local mode, sync across browser tabs on the same device
    window.addEventListener('storage', () => { loadLocal(); fire(); });
  }

  function subscribeAll() {
    // Menu doc: overrides + custom categories
    fdb.collection('restaurant').doc('menu').onSnapshot(doc => {
      const d = doc.exists ? doc.data() : {};
      cache.overrides = d.overrides || {};
      cache.customCategories = d.customCategories || [];
      fire();
    }, err => console.warn('menu sync error', err));

    // Custom items collection
    fdb.collection('customItems').onSnapshot(snap => {
      cache.customItems = snap.docs.map(d => d.data());
      fire();
    }, err => console.warn('customItems sync error', err));

    // Orders collection (newest first)
    fdb.collection('orders').orderBy('timestamp', 'desc').onSnapshot(snap => {
      cache.orders = snap.docs.map(d => d.data());
      fire();
    }, err => console.warn('orders sync error', err));
  }

  function saveMenuDoc() {
    if (useFB) {
      fdb.collection('restaurant').doc('menu').set({
        overrides: cache.overrides,
        customCategories: cache.customCategories
      }, { merge: true }).catch(e => console.error('saveMenuDoc', e));
    } else {
      persistLocalMenu(); fire();
    }
  }

  // ---------- public read API (synchronous, from cache) ----------
  function getOverrides() { return cache.overrides; }
  function getCustomItems() { return cache.customItems; }
  function getCustomCategories() { return cache.customCategories; }
  function getOrders() { return cache.orders; }

  // ---------- public write API ----------
  function saveMenuOverride(id, changes) {
    cache.overrides[id] = { ...(cache.overrides[id] || {}), ...changes };
    saveMenuDoc();
  }

  function addCategory(name) {
    name = (name || '').trim();
    if (!name) return false;
    const exists = cache.customCategories.some(c => c.toLowerCase() === name.toLowerCase());
    if (exists) return false;
    cache.customCategories.push(name);
    saveMenuDoc();
    return true;
  }

  function removeCategory(name) {
    cache.customCategories = cache.customCategories.filter(c => c !== name);
    saveMenuDoc();
  }

  function saveCustomItem(item) {
    if (useFB) {
      fdb.collection('customItems').doc(String(item.id)).set(item).catch(e => console.error('saveCustomItem', e));
    } else {
      const idx = cache.customItems.findIndex(i => i.id === item.id);
      if (idx >= 0) cache.customItems[idx] = item; else cache.customItems.push(item);
      persistLocalMenu(); fire();
    }
  }

  function deleteCustomItem(id) {
    if (useFB) {
      fdb.collection('customItems').doc(String(id)).delete().catch(e => console.error('deleteCustomItem', e));
    } else {
      cache.customItems = cache.customItems.filter(i => i.id !== id);
      persistLocalMenu(); fire();
    }
  }

  function saveOrder(order) {
    if (useFB) {
      fdb.collection('orders').doc(order.id).set(order).catch(e => console.error('saveOrder', e));
    } else {
      cache.orders.unshift(order);
      persistLocalOrders(); fire();
    }
  }

  function updateOrderStatus(orderId, status) {
    if (useFB) {
      fdb.collection('orders').doc(orderId).update({ orderStatus: status }).catch(e => console.error('updateOrderStatus', e));
    } else {
      const o = cache.orders.find(o => o.id === orderId);
      if (o) { o.orderStatus = status; persistLocalOrders(); fire(); }
    }
  }

  function clearOrders() {
    if (useFB) {
      fdb.collection('orders').get().then(snap => {
        const batch = fdb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        return batch.commit();
      }).catch(e => console.error('clearOrders', e));
    } else {
      cache.orders = []; persistLocalOrders(); fire();
    }
  }

  function resetAll() {
    cache.overrides = {};
    cache.customCategories = [];
    if (useFB) {
      saveMenuDoc();
      fdb.collection('customItems').get().then(snap => {
        const batch = fdb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        return batch.commit();
      }).catch(e => console.error('resetAll', e));
    } else {
      cache.customItems = [];
      persistLocalMenu(); fire();
    }
  }

  function isCloud() { return useFB; }

  init();

  return {
    onChange, getOverrides, getCustomItems, getCustomCategories, getOrders,
    saveMenuOverride, addCategory, removeCategory, saveCustomItem, deleteCustomItem,
    saveOrder, updateOrderStatus, clearOrders, resetAll, isCloud
  };
})();

/* =====================================================================
   RECOMMENDED FIRESTORE SECURITY RULES (paste in Firestore -> Rules):
   Anyone can read the menu & create an order; only writes to menu/items
   should ideally be protected behind auth in a future version.
   ---------------------------------------------------------------------
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /restaurant/{doc}  { allow read: if true; allow write: if true; }
       match /customItems/{doc} { allow read: if true; allow write: if true; }
       match /orders/{doc}      { allow read: if true; allow write: if true; }
     }
   }
   (Test mode applies open rules automatically for 30 days.)
   ===================================================================== */
