// ===== ADMIN PANEL LOGIC =====
let orderRange = 'all';

// ===== AUTH =====
function isLoggedIn() {
  return sessionStorage.getItem('adminLoggedIn') === 'true';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};

  if (email.toLowerCase() === (c.ADMIN_EMAIL || '').toLowerCase() && password === c.ADMIN_PASSWORD) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    showDashboard();
  } else {
    errEl.textContent = '❌ Invalid email or password. Please try again.';
  }
}

function doLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-password').value = '';
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  setAdminDate();
  populateCategoryDropdowns();
  renderOverview();
  renderAdminItems();
  renderSpecialsAdmin();
  renderCustomCategories();
  renderOrders();
  lastOrderCount = DB.getOrders().length;
}

// ===== NEW ORDER ALERT =====
let lastOrderCount = 0;
function checkForNewOrders() {
  const count = DB.getOrders().length;
  if (isLoggedIn() && count > lastOrderCount && lastOrderCount !== 0) {
    showNewOrderBanner(count - lastOrderCount);
    beep();
  }
  lastOrderCount = count;
}

function showNewOrderBanner(n) {
  let banner = document.getElementById('new-order-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'new-order-banner';
    banner.className = 'new-order-banner';
    banner.onclick = () => { switchTab('orders'); banner.remove(); };
    document.body.appendChild(banner);
  }
  banner.innerHTML = `🔔 ${n} NEW ORDER${n > 1 ? 'S' : ''} received! Tap to view.`;
  setTimeout(() => { if (banner) banner.remove(); }, 8000);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.1;
    o.start(); o.stop(ctx.currentTime + 0.25);
  } catch (e) { /* audio not available */ }
}

function setAdminDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('admin-date').textContent = now.toLocaleDateString('en-IN', opts);
}

// ===== TAB SWITCHING =====
const tabTitles = {
  overview: 'Dashboard Overview',
  items: 'Manage Menu Items',
  add: 'Add New Item',
  specials: 'Daily Specials & Best Sellers',
  orders: 'Order History'
};

function switchTab(tab) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.getAttribute('data-tab') === tab));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('page-title').textContent = tabTitles[tab] || 'Dashboard';
  if (tab === 'overview') renderOverview();
  if (tab === 'items') renderAdminItems();
  if (tab === 'specials') renderSpecialsAdmin();
  if (tab === 'orders') renderOrders();
  if (tab === 'add') { populateCategoryDropdowns(); renderCustomCategories(); }
  // close sidebar on mobile
  document.getElementById('admin-sidebar').classList.remove('open');
  document.getElementById('admin-overlay').classList.remove('active');
}

function toggleSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('open');
  document.getElementById('admin-overlay').classList.toggle('active');
}

// ===== OVERVIEW / ANALYTICS =====
function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function renderOverview() {
  const orders = getOrders();
  const menu = getMenuWithOverrides();

  const todayOrders = orders.filter(o => isToday(o.timestamp));
  const monthOrders = orders.filter(o => isThisMonth(o.timestamp));

  const sum = arr => arr.reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById('stat-today-orders').textContent = todayOrders.length;
  document.getElementById('stat-today-revenue').textContent = '₹' + sum(todayOrders);
  document.getElementById('stat-month-orders').textContent = monthOrders.length;
  document.getElementById('stat-month-revenue').textContent = '₹' + sum(monthOrders);
  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-total-items').textContent = menu.length;

  // Most ordered item
  const itemCounts = {};
  const catCounts = {};
  orders.forEach(o => {
    (o.items || []).forEach(it => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.qty;
      if (it.category) catCounts[it.category] = (catCounts[it.category] || 0) + it.qty;
    });
  });

  const moEl = document.getElementById('most-ordered');
  const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
  if (topItem) {
    const itemData = menu.find(m => m.name === topItem[0]);
    moEl.innerHTML = `
      ${itemData ? `<img src="${itemData.image}" alt="${topItem[0]}" onerror="this.style.display='none'">` : ''}
      <div><div class="mo-name">${topItem[0]}</div><div class="mo-count">${topItem[1]} orders</div></div>`;
  } else {
    moEl.innerHTML = '<p class="empty-note">No orders yet.</p>';
  }

  const pcEl = document.getElementById('popular-category');
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    pcEl.innerHTML = `<div><div class="mo-name">${topCat[0]}</div><div class="mo-count">${topCat[1]} items ordered</div></div>`;
  } else {
    pcEl.innerHTML = '<p class="empty-note">No orders yet.</p>';
  }

  // Recent orders
  const recentEl = document.getElementById('recent-orders-list');
  if (orders.length === 0) {
    recentEl.innerHTML = '<p class="empty-note">No orders yet. Orders placed by customers will appear here.</p>';
  } else {
    recentEl.innerHTML = orders.slice(0, 5).map(o => `
      <div class="order-row">
        <div class="order-info">
          <div class="order-customer">${o.customerName}</div>
          <div class="order-meta">📱 ${o.mobile} • ${o.displayTime}</div>
          <div class="order-items-summary">${(o.items || []).map(i => i.name + ' x' + i.qty).join(', ')}</div>
        </div>
        <div class="order-amount">₹${o.total}</div>
      </div>`).join('');
  }
}

// ===== MANAGE ITEMS =====
function renderAdminItems() {
  const search = (document.getElementById('admin-item-search').value || '').toLowerCase().trim();
  const cat = document.getElementById('admin-cat-filter').value;
  let items = getMenuWithOverrides();

  if (cat !== 'all') items = items.filter(i => i.category === cat);
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search));

  const list = document.getElementById('admin-items-list');
  if (items.length === 0) {
    list.innerHTML = '<p class="empty-note">No items match your search.</p>';
    return;
  }

  list.innerHTML = items.map(item => {
    const available = item.status === 'available';
    const dotColor = item.type === 'veg' ? 'var(--veg)' : (item.type === 'egg' ? 'var(--egg)' : 'var(--nonveg)');
    let tags = '';
    if (item.badges.includes('bestseller')) tags += '<span class="admin-tag-mini tag-best">🔥 Best Seller</span>';
    if (item.badges.includes('special')) tags += '<span class="admin-tag-mini tag-special">⭐ Special</span>';

    return `
      <div class="admin-item ${available ? '' : 'unavail'}">
        <div class="admin-item-img"><img src="${item.image}" alt="${item.name}" onerror="this.src='Images/download.jpg'"></div>
        <div class="admin-item-body">
          <div class="admin-item-name"><span class="dot" style="background:${dotColor}"></span>${item.name}</div>
          <div class="admin-item-cat">${item.category} • Serves ${item.serves}</div>
          <div class="admin-item-price">₹${item.price}</div>
          <div class="admin-item-tags">${tags}</div>
          <div class="admin-item-actions">
            <button class="ai-btn ai-btn-edit" onclick="editItem(${item.id})">✏️ Edit</button>
            <button class="ai-btn ai-btn-toggle ${available ? 'on' : 'off'}" onclick="toggleAvailability(${item.id})">${available ? '✅ Available' : '❌ Unavailable'}</button>
            <button class="ai-btn ai-btn-del" onclick="deleteItem(${item.id})">🗑 Delete</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleAvailability(id) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item) return;
  const newStatus = item.status === 'available' ? 'unavailable' : 'available';
  saveMenuOverride(id, { status: newStatus });
  renderAdminItems();
  renderOverview();
}

function deleteItem(id) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}"? This will remove it from the customer website.`)) return;
  const isCustom = DB.getCustomItems().some(i => i.id === id);
  if (isCustom) {
    DB.deleteCustomItem(id);               // remove owner-added item entirely
  } else {
    saveMenuOverride(id, { deleted: true }); // hide a base menu item
  }
  renderAdminItems();
}

// ===== ADD / EDIT ITEM =====
let newImageData = '';

// Compress + resize an uploaded/captured photo so it loads fast and fits in
// the cloud database (max ~700px, JPEG quality 0.7 -> typically 30-70 KB).
function previewNewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const preview = document.getElementById('new-image-preview');
  preview.innerHTML = '<p class="field-hint">Processing image…</p>';

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const MAX = 700;
      let w = img.width, h = img.height;
      if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      newImageData = canvas.toDataURL('image/jpeg', 0.7);
      preview.innerHTML = `<img src="${newImageData}" alt="preview">`;
    };
    img.onerror = function () { preview.innerHTML = '<p class="field-hint" style="color:var(--nonveg)">Could not read this image. Try another.</p>'; };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== CATEGORY MANAGEMENT =====
function populateCategoryDropdowns() {
  const cats = getAllCategories();
  // Add-item form dropdown
  const sel = document.getElementById('new-category');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    if (cats.includes(current)) sel.value = current;
  }
  // Manage-items filter dropdown
  const filter = document.getElementById('admin-cat-filter');
  if (filter) {
    const current = filter.value || 'all';
    filter.innerHTML = '<option value="all">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    filter.value = (current === 'all' || cats.includes(current)) ? current : 'all';
  }
}

function toggleAddCategory() {
  const box = document.getElementById('add-cat-box');
  box.style.display = box.style.display === 'none' ? 'flex' : 'none';
  if (box.style.display === 'flex') document.getElementById('new-cat-name').focus();
}

function addNewCategory() {
  const input = document.getElementById('new-cat-name');
  const name = input.value.trim();
  if (!name) { alert('Please enter a category name.'); return; }
  const ok = DB.addCategory(name);
  if (!ok) { alert('That category already exists.'); return; }
  input.value = '';
  document.getElementById('add-cat-box').style.display = 'none';
  populateCategoryDropdowns();
  document.getElementById('new-category').value = name;
  renderCustomCategories();
  alert(`✅ Category "${name}" added. You can now add items under it.`);
}

function renderCustomCategories() {
  const el = document.getElementById('custom-cat-list');
  if (!el) return;
  const custom = DB.getCustomCategories();
  if (custom.length === 0) {
    el.innerHTML = '<p class="empty-note">No custom categories yet. Click "＋ Add new category" above.</p>';
    return;
  }
  el.innerHTML = custom.map(c => {
    const count = getMenuWithOverrides().filter(i => i.category === c).length;
    return `<div class="custom-cat-chip">
      <span>${c} <small>(${count} item${count !== 1 ? 's' : ''})</small></span>
      <button onclick="removeCustomCategory('${c.replace(/'/g, "\\'")}')" title="Remove category">✕</button>
    </div>`;
  }).join('');
}

function removeCustomCategory(name) {
  const count = getMenuWithOverrides().filter(i => i.category === name).length;
  let msg = `Remove the category "${name}"?`;
  if (count > 0) msg += `\n\nNote: ${count} item(s) are in this category. They will stay but their category will no longer show as a filter.`;
  if (!confirm(msg)) return;
  DB.removeCategory(name);
  populateCategoryDropdowns();
  renderCustomCategories();
}

function editItem(id) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item) return;
  switchTab('add');
  document.getElementById('add-form-title').textContent = '✏️ Edit Item';
  document.getElementById('edit-item-id').value = id;
  document.getElementById('new-name').value = item.name;
  document.getElementById('new-price').value = item.price;
  document.getElementById('new-category').value = item.category;
  document.getElementById('new-type').value = item.type;
  document.getElementById('new-serves').value = item.serves;
  document.getElementById('new-spice').value = item.spiceLevel;
  document.getElementById('new-desc').value = item.description;
  document.getElementById('new-bestseller').checked = item.badges.includes('bestseller');
  document.getElementById('new-special').checked = item.badges.includes('special');
  document.getElementById('new-available').checked = item.status === 'available';
  newImageData = item.image;
  document.getElementById('new-image-preview').innerHTML = `<img src="${item.image}" alt="preview" onerror="this.src='Images/download.jpg'">`;
  document.getElementById('btn-cancel-edit').style.display = 'inline-block';
}

function cancelEdit() {
  clearAddForm();
  switchTab('items');
}

function clearAddForm() {
  document.getElementById('add-form-title').textContent = '➕ Add New Item';
  document.getElementById('edit-item-id').value = '';
  document.getElementById('new-name').value = '';
  document.getElementById('new-price').value = '';
  document.getElementById('new-category').value = 'Starters';
  document.getElementById('new-type').value = 'veg';
  document.getElementById('new-serves').value = '1-2';
  document.getElementById('new-spice').value = 'medium';
  document.getElementById('new-desc').value = '';
  document.getElementById('new-bestseller').checked = false;
  document.getElementById('new-special').checked = false;
  document.getElementById('new-available').checked = true;
  document.getElementById('new-image-file').value = '';
  document.getElementById('new-image-preview').innerHTML = '';
  document.getElementById('btn-cancel-edit').style.display = 'none';
  newImageData = '';
}

function saveNewItem() {
  const name = document.getElementById('new-name').value.trim();
  const price = parseInt(document.getElementById('new-price').value);
  if (!name) { alert('Please enter an item name.'); return; }
  if (!price || price <= 0) { alert('Please enter a valid price.'); return; }

  const badges = [];
  if (document.getElementById('new-bestseller').checked) badges.push('bestseller');
  if (document.getElementById('new-special').checked) badges.push('special');

  const itemData = {
    name: name,
    price: price,
    category: document.getElementById('new-category').value,
    type: document.getElementById('new-type').value,
    serves: document.getElementById('new-serves').value || '1-2',
    spiceLevel: document.getElementById('new-spice').value,
    description: document.getElementById('new-desc').value.trim() || 'A delicious dish prepared fresh in our kitchen.',
    image: newImageData || 'Images/download.jpg',
    status: document.getElementById('new-available').checked ? 'available' : 'unavailable',
    badges: badges,
    subcategory: document.getElementById('new-category').value
  };

  const editId = document.getElementById('edit-item-id').value;

  if (editId) {
    const id = parseInt(editId);
    const isCustom = DB.getCustomItems().some(i => i.id === id);
    if (isCustom) {
      // Update the custom item record directly
      itemData.id = id;
      itemData.subcategory = itemData.category;
      DB.saveCustomItem(itemData);
    } else {
      // Base menu item — store edits as an override
      saveMenuOverride(id, itemData);
    }
    alert('✅ Item updated! Changes are now live on the website.');
  } else {
    // New custom item
    const customItems = DB.getCustomItems();
    const maxId = Math.max(1000, ...customItems.map(i => i.id), ...MENU_DATA.map(i => i.id));
    itemData.id = maxId + 1;
    DB.saveCustomItem(itemData);
    alert('✅ New item added! It is now live on the customer website.');
  }

  clearAddForm();
  switchTab('items');
}

// ===== RESET OVERRIDES =====
function resetAllOverrides() {
  if (!confirm('Reset ALL changes (availability, edits, deletions, custom categories) back to the original menu? Custom-added items will also be removed.')) return;
  DB.resetAll();
  renderAdminItems();
  populateCategoryDropdowns();
  renderCustomCategories();
  alert('✅ Menu reset to default.');
}

// ===== SPECIALS ADMIN =====
function renderSpecialsAdmin() {
  const search = (document.getElementById('specials-search').value || '').toLowerCase().trim();
  let items = getMenuWithOverrides();
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search));

  const list = document.getElementById('specials-admin-list');
  list.innerHTML = items.map(item => {
    const isBest = item.badges.includes('bestseller');
    const isSpecial = item.badges.includes('special');
    return `
      <div class="special-admin-row">
        <img src="${item.image}" alt="${item.name}" onerror="this.src='Images/download.jpg'">
        <span class="sa-name">${item.name}</span>
        <button class="sa-toggle ${isBest ? 'on-best' : ''}" onclick="toggleBadge(${item.id}, 'bestseller')">🔥 Best Seller</button>
        <button class="sa-toggle ${isSpecial ? 'on-special' : ''}" onclick="toggleBadge(${item.id}, 'special')">⭐ Special</button>
      </div>`;
  }).join('');
}

function toggleBadge(id, badge) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item) return;
  let badges = [...item.badges];
  if (badges.includes(badge)) badges = badges.filter(b => b !== badge);
  else badges.push(badge);
  saveMenuOverride(id, { badges: badges });
  renderSpecialsAdmin();
  renderAdminItems();
}

// ===== ORDERS =====
function setOrderRange(range) {
  orderRange = range;
  document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-range') === range));
  renderOrders();
}

function renderOrders() {
  let orders = getOrders();
  if (orderRange === 'today') orders = orders.filter(o => isToday(o.timestamp));
  if (orderRange === 'month') orders = orders.filter(o => isThisMonth(o.timestamp));

  const list = document.getElementById('orders-list');
  if (orders.length === 0) {
    list.innerHTML = '<div class="orders-empty"><span>📭</span><p>No orders in this period.</p></div>';
    return;
  }

  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};

  const STATUSES = ['New', 'Preparing', 'Out for Delivery', 'Completed'];

  list.innerHTML = orders.map(o => {
    const status = o.orderStatus || 'New';
    const waNum = o.mobile.replace(/[^\d]/g, '').length === 10 ? '91' + o.mobile.replace(/[^\d]/g, '') : o.mobile.replace(/[^\d]/g, '');
    return `
    <div class="order-card status-${status.replace(/\s/g,'').toLowerCase()}">
      <div class="order-card-header">
        <div>
          <div class="order-customer">${o.customerName} <span class="order-status-badge badge-${status.replace(/\s/g,'').toLowerCase()}">${status}</span></div>
          <div class="order-meta">📱 ${o.mobile}</div>
          <div class="order-meta">📍 ${o.address}${o.landmark ? ' (' + o.landmark + ')' : ''}</div>
        </div>
        <div style="text-align:right;">
          <div class="order-amount">₹${o.total}</div>
          <div class="order-card-id">${o.id}</div>
        </div>
      </div>
      <div class="order-card-items">
        ${(o.items || []).map(i => `<div class="order-card-item">• ${i.name} × ${i.qty} — ₹${i.price * i.qty}${i.customization ? `<br><em>↳ ${i.customization}</em>` : ''}</div>`).join('')}
      </div>
      <div class="order-status-row">
        <span class="order-status-label">Update status:</span>
        ${STATUSES.map(s => `<button class="status-btn ${s === status ? 'active' : ''}" onclick="setOrderStatus('${o.id}','${s}')">${s}</button>`).join('')}
      </div>
      <div class="order-card-footer">
        <span>🕒 ${o.displayTime}</span>
        <button class="order-wa-btn" onclick="window.open('https://wa.me/${waNum}', '_blank')">💬 Contact Customer</button>
      </div>
    </div>`;
  }).join('');
}

function setOrderStatus(orderId, status) {
  DB.updateOrderStatus(orderId, status);
  renderOrders();
}

function clearAllOrders() {
  if (!confirm('Clear ALL order history? This cannot be undone.')) return;
  DB.clearOrders();
  renderOrders();
  renderOverview();
}

// Re-render whatever the owner is currently viewing when shared data changes
// (e.g. a NEW ORDER arrives from a customer's phone — it appears instantly).
function refreshActiveViews() {
  if (!isLoggedIn()) return;
  const active = document.querySelector('.admin-tab.active');
  if (!active) return;
  if (active.id === 'tab-overview') renderOverview();
  if (active.id === 'tab-items') renderAdminItems();
  if (active.id === 'tab-specials') renderSpecialsAdmin();
  if (active.id === 'tab-orders') renderOrders();
  if (active.id === 'tab-add') { populateCategoryDropdowns(); renderCustomCategories(); }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Re-render live whenever shared data changes (new orders, edits from another device)
  DB.onChange(() => { refreshActiveViews(); checkForNewOrders(); });

  if (isLoggedIn()) {
    showDashboard();
  }
  // Prefill login email hint
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const emailInput = document.getElementById('login-email');
  if (emailInput && c.ADMIN_EMAIL) emailInput.placeholder = c.ADMIN_EMAIL;
});
