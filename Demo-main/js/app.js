// ===== GLOBAL STATE =====
let vegMode = false;
let currentFilter = 'all';
let searchQuery = '';
let customizeItemId = null;

// ===== SPLASH SCREEN =====
let splashCountdown = 3;
let splashInterval;

function closeSplash() {
  const splash = document.getElementById('splash-screen');
  splash.classList.add('hidden');
  clearInterval(splashInterval);
  sessionStorage.setItem('splashSeen', 'true');
}

function startSplash() {
  // Only show splash once per browser session
  if (sessionStorage.getItem('splashSeen') === 'true') {
    document.getElementById('splash-screen').classList.add('hidden');
    return;
  }
  const countEl = document.getElementById('splash-count');
  splashInterval = setInterval(() => {
    splashCountdown--;
    if (countEl) countEl.textContent = splashCountdown;
    if (splashCountdown <= 0) closeSplash();
  }, 1000);
}

// ===== CONFIG / ENV BINDING =====
function applyConfig() {
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const phone = c.RESTAURANT_PHONE || '';
  const wa = c.RESTAURANT_WHATSAPP || '';
  const addr = c.RESTAURANT_ADDRESS || '';
  const open = c.OPEN_TIME || '';
  const close = c.CLOSE_TIME || '';
  const timings = `${open} – ${close}`;

  setText('contact-phone', formatPhone(phone));
  setText('contact-whatsapp', formatPhone(wa));
  setText('contact-address', addr);
  setText('contact-timings', timings);
  setText('about-timings', timings);
  setText('footer-address', addr);

  updateOpenStatus();
}

function formatPhone(p) {
  if (!p) return '';
  // +919999999999 -> +91 99999 99999
  const digits = p.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91 ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  }
  return p;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateOpenStatus() {
  const el = document.getElementById('open-status');
  if (!el) return;
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const openMin = parseTimeToMinutes(c.OPEN_TIME);
  const closeMin = parseTimeToMinutes(c.CLOSE_TIME);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let isOpen;
  if (closeMin > openMin) {
    isOpen = nowMin >= openMin && nowMin < closeMin;
  } else {
    // crosses midnight
    isOpen = nowMin >= openMin || nowMin < closeMin;
  }

  if (isOpen) {
    el.textContent = '🟢 Open Now';
    el.classList.add('open'); el.classList.remove('closed');
  } else {
    el.textContent = '🔴 Closed Now';
    el.classList.add('closed'); el.classList.remove('open');
  }
}

function parseTimeToMinutes(str) {
  if (!str) return 0;
  const m = str.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// ===== CONTACT ACTIONS =====
function handleCall() {
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const phone = (c.RESTAURANT_PHONE || '').replace(/\s/g, '');
  if (phone) window.location.href = 'tel:' + phone;
}

function handleWhatsApp() {
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const wa = (c.RESTAURANT_WHATSAPP || '').replace(/[^\d]/g, '');
  if (wa) {
    const msg = encodeURIComponent('Hello! I would like to know more about Sr Grand Hotel Grand Multi Cuisine Restaurant.');
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank');
  }
}

function handleMap() {
  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const url = c.RESTAURANT_MAP_URL || 'https://maps.google.com';
  window.open(url, '_blank');
}

// ===== VEG MODE =====
function toggleVegMode() {
  vegMode = !vegMode;
  const btn = document.getElementById('veg-toggle');
  btn.classList.toggle('active', vegMode);
  btn.querySelector('.veg-label').textContent = vegMode ? 'Veg Only' : 'Veg Mode';
  renderMenu();
  renderBestSellers();
  renderSpecials();
  if (vegMode) showToast('Veg Mode ON — showing only vegetarian dishes');
  else showToast('Veg Mode OFF — showing all dishes');
}

// ===== FILTER TAGS (dynamic — includes owner's custom categories) =====
function renderFilterTags() {
  const container = document.getElementById('filter-tags');
  if (!container) return;
  const cats = getAllCategories();
  const fixed = [
    { f: 'all', label: 'All' },
    { f: 'veg', label: '🟢 Veg' },
    { f: 'non-veg', label: '🔴 Non-Veg' },
    { f: 'bestseller', label: '🔥 Best Sellers' },
    { f: 'special', label: "⭐ Today's Special" }
  ];
  let html = fixed.map(x => `<button class="filter-tag ${currentFilter === x.f ? 'active' : ''}" data-filter="${x.f}" onclick="setFilter('${x.f}')">${x.label}</button>`).join('');
  html += cats.map(c => `<button class="filter-tag ${currentFilter === c ? 'active' : ''}" data-filter="${c}" onclick="setFilter('${c.replace(/'/g, "\\'")}')">${getCategoryIcon(c)} ${c}</button>`).join('');
  container.innerHTML = html;
}

// ===== FILTERS & SEARCH =====
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tag').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-filter') === filter);
  });
  renderMenu();
}

function filterMenu() {
  searchQuery = document.getElementById('menu-search').value.toLowerCase().trim();
  document.getElementById('search-clear').style.display = searchQuery ? 'block' : 'none';
  renderMenu();
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('menu-search').value = '';
  document.getElementById('search-clear').style.display = 'none';
  renderMenu();
}

function itemMatchesFilters(item) {
  // Veg mode hides all non-veg AND egg
  if (vegMode && item.type !== 'veg') return false;

  // Search
  if (searchQuery) {
    const haystack = (item.name + ' ' + item.category + ' ' + item.subcategory + ' ' + item.description).toLowerCase();
    if (!haystack.includes(searchQuery)) return false;
  }

  // Filter tag
  switch (currentFilter) {
    case 'all': return true;
    case 'veg': return item.type === 'veg';
    case 'non-veg': return item.type === 'non-veg' || item.type === 'egg';
    case 'bestseller': return item.badges.includes('bestseller');
    case 'special': return item.badges.includes('special');
    default: return item.category === currentFilter;
  }
}

// ===== RENDER MENU =====
function renderMenu() {
  const container = document.getElementById('menu-sections');
  const noResults = document.getElementById('no-results');
  if (!container) return;

  const items = getMenuWithOverrides().filter(itemMatchesFilters);

  if (items.length === 0) {
    container.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  // Group by category, then subcategory (includes owner's custom categories)
  const categoryOrder = getAllCategories();
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = {};
    if (!grouped[item.category][item.subcategory]) grouped[item.category][item.subcategory] = [];
    grouped[item.category][item.subcategory].push(item);
  });

  let html = '';
  categoryOrder.forEach(cat => {
    if (!grouped[cat]) return;
    const catCount = Object.values(grouped[cat]).reduce((s, arr) => s + arr.length, 0);
    html += `<div class="menu-category">
      <div class="category-header">
        <h3>${getCategoryIcon(cat)} ${cat}</h3>
        <span class="category-count">${catCount}</span>
      </div>`;

    const subOrder = Object.keys(grouped[cat]);
    subOrder.forEach(sub => {
      const subItems = grouped[cat][sub];
      // Only show subcategory label if there are multiple subcategories
      if (Object.keys(grouped[cat]).length > 1) {
        html += `<div class="subcategory-label">${sub}</div>`;
      }
      html += `<div class="items-grid">${subItems.map(renderItemCard).join('')}</div>`;
    });
    html += `</div>`;
  });

  container.innerHTML = html;
  updateCartUI();
}

function getCategoryIcon(cat) {
  const icons = {
    'Soups': '🍜', 'Starters': '🍗', 'Main Course': '🍛',
    'Breads': '🫓', 'Rice & Biryani': '🍚', 'Fried Rice & Noodles': '🍝'
  };
  return icons[cat] || '🍽';
}

function getSpiceDots(level) {
  const levels = { 'none': 0, 'mild': 1, 'medium': 2, 'hot': 3, 'extra-hot': 4 };
  const n = levels[level] || 0;
  if (n === 0) return '';
  let dots = '';
  for (let i = 1; i <= 4; i++) {
    dots += `<span class="spice-dot ${i <= n ? 'active' : ''}"></span>`;
  }
  return `<span title="Spice: ${level}"><span class="spice-dots">${dots}</span></span>`;
}

function renderItemCard(item) {
  const available = item.status === 'available';
  const typeClass = item.type;
  let badgeHtml = '';
  if (!available) badgeHtml += '<span class="badge badge-unavailable">Not Available</span>';
  if (item.badges.includes('bestseller')) badgeHtml += '<span class="badge badge-bestseller">🔥 Best Seller</span>';
  if (item.badges.includes('special')) badgeHtml += '<span class="badge badge-special">⭐ Special</span>';

  return `
    <div class="item-card ${available ? '' : 'unavailable'}">
      <div class="item-img">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='Images/download.jpg'">
        <div class="item-badge">${badgeHtml}</div>
        <div class="type-indicator ${typeClass}"></div>
      </div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">
          <span>👥 Serves ${item.serves}</span>
          ${getSpiceDots(item.spiceLevel)}
        </div>
        <div class="item-desc">${item.description}</div>
        <div class="item-footer">
          <span class="item-price">₹${item.price}</span>
          <div class="item-actions">
            <button class="btn-details" onclick="openItemModal(${item.id})">More</button>
            ${available
              ? `<button class="btn-add" data-item-id="${item.id}" onclick="openCustomize(${item.id})">+ Add</button>`
              : `<button class="btn-unavailable" disabled>Unavailable</button>`}
          </div>
        </div>
      </div>
    </div>`;
}

// ===== BEST SELLERS =====
function renderBestSellers() {
  const grid = document.getElementById('bestsellers-grid');
  if (!grid) return;
  let items = getMenuWithOverrides().filter(i => i.badges.includes('bestseller') && i.status === 'available');
  if (vegMode) items = items.filter(i => i.type === 'veg');
  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-light);">No best sellers match the current view.</p>';
    return;
  }
  grid.innerHTML = items.slice(0, 8).map(renderItemCard).join('');
  updateCartUI();
}

// ===== TODAY'S SPECIALS =====
function renderSpecials() {
  const grid = document.getElementById('specials-grid');
  const banner = document.getElementById('specials-banner');
  if (!grid) return;
  let items = getMenuWithOverrides().filter(i => i.badges.includes('special') && i.status === 'available');
  if (vegMode) items = items.filter(i => i.type === 'veg');

  if (items.length === 0) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'block';
  grid.innerHTML = items.map(i => `
    <div class="special-chip" onclick="openItemModal(${i.id})" style="cursor:pointer;">
      <span class="type-indicator ${i.type}" style="position:static;"></span>
      <span>${i.name}</span> — ₹${i.price}
    </div>`).join('');
}

// ===== ITEM DETAIL MODAL =====
function openItemModal(id) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item) return;
  const available = item.status === 'available';
  const typeLabel = item.type === 'veg' ? '🟢 Veg' : (item.type === 'egg' ? '🥚 Egg' : '🔴 Non-Veg');

  let badgeHtml = `<span class="badge ${item.type === 'veg' ? 'badge-special' : 'badge-bestseller'}" style="background:${item.type === 'veg' ? 'var(--veg)' : 'var(--nonveg)'};">${typeLabel}</span>`;
  if (item.badges.includes('bestseller')) badgeHtml += '<span class="badge badge-bestseller">🔥 Best Seller</span>';
  if (item.badges.includes('special')) badgeHtml += '<span class="badge badge-special">⭐ Today\'s Special</span>';
  badgeHtml += available
    ? '<span class="badge" style="background:var(--veg);color:white;">✅ Available</span>'
    : '<span class="badge badge-unavailable">❌ Not Available</span>';

  document.getElementById('item-modal-body').innerHTML = `
    <div class="item-detail-img">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='Images/download.jpg'">
    </div>
    <div class="item-detail-body">
      <div class="item-detail-header">
        <div class="item-detail-name">${item.name}</div>
        <div class="item-detail-price">₹${item.price}</div>
      </div>
      <div class="item-detail-badges">${badgeHtml}</div>
      <p class="item-detail-desc">${item.description}</p>
      <div class="item-detail-meta">
        <div class="detail-meta-item"><span>Category</span><span>${item.category}</span></div>
        <div class="detail-meta-item"><span>Serves</span><span>👥 ${item.serves} ${parseInt(item.serves) > 1 ? 'people' : 'person'}</span></div>
        <div class="detail-meta-item"><span>Spice Level</span><span>${spiceLabel(item.spiceLevel)}</span></div>
        <div class="detail-meta-item"><span>Type</span><span>${typeLabel}</span></div>
      </div>
      ${available
        ? `<button class="item-detail-btn" onclick="closeItemModal(); openCustomize(${item.id})">Add to Cart — ₹${item.price}</button>`
        : `<button class="item-detail-btn unavailable-btn" disabled>Currently Not Available</button>`}
    </div>`;

  openModal('item-modal');
}

function spiceLabel(level) {
  const labels = {
    'none': 'No Spice', 'mild': '🌶 Mild', 'medium': '🌶🌶 Medium',
    'hot': '🌶🌶🌶 Hot', 'extra-hot': '🌶🌶🌶🌶 Extra Hot'
  };
  return labels[level] || level;
}

function closeItemModal() { closeModal('item-modal'); }

// ===== CUSTOMIZE MODAL =====
function openCustomize(id) {
  const item = getMenuWithOverrides().find(i => i.id === id);
  if (!item || item.status !== 'available') return;
  customizeItemId = id;

  document.getElementById('customize-item-info').innerHTML = `
    <img src="${item.image}" alt="${item.name}" onerror="this.src='Images/download.jpg'">
    <div>
      <div class="ci-name">${item.name}</div>
      <div class="ci-price">₹${item.price}</div>
    </div>`;

  // Reset
  document.getElementById('custom-note').value = '';
  document.querySelectorAll('.quick-opt').forEach(o => o.classList.remove('selected'));

  openModal('customize-modal');
}

function toggleQuickOpt(btn) {
  btn.classList.toggle('selected');
}

function addToCartFromCustomize() {
  const selected = Array.from(document.querySelectorAll('.quick-opt.selected')).map(o => o.textContent);
  const note = document.getElementById('custom-note').value.trim();
  let customization = selected.join(', ');
  if (note) customization += (customization ? ', ' : '') + note;

  addToCart(customizeItemId, customization);
  closeCustomizeModal();
}

function closeCustomizeModal() { closeModal('customize-modal'); }

// ===== CART DRAWER =====
function openCart() {
  renderCart();
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  hideOverlayIfNoModal();
  document.body.style.overflow = '';
}

// ===== ORDER FLOW =====
function proceedToCheckout() {
  if (cart.length === 0) return;
  closeCart();
  renderOrderPreview();
  openModal('order-modal');
}

function renderOrderPreview() {
  const preview = document.getElementById('order-summary-preview');
  let html = '<strong>Order Summary</strong>';
  cart.forEach(line => {
    html += `<div class="preview-item">${line.name} × ${line.qty} — ₹${line.price * line.qty}${line.customization ? `<br><em style="font-size:0.72rem;">↳ ${line.customization}</em>` : ''}</div>`;
  });
  html += `<div class="preview-total">Total: ₹${getCartTotal()}</div>`;
  preview.innerHTML = html;
}

function closeOrderModal() { closeModal('order-modal'); }

function sendWhatsAppOrder() {
  const name = document.getElementById('order-name').value.trim();
  const mobile = document.getElementById('order-mobile').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const landmark = document.getElementById('order-landmark').value.trim();

  // Validation
  if (!name) { alert('Please enter your name.'); return; }
  if (!mobile || mobile.length < 10) { alert('Please enter a valid 10-digit mobile number.'); return; }
  if (!address) { alert('Please enter your delivery address.'); return; }

  const c = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const ownerWa = (c.RESTAURANT_WHATSAPP || '').replace(/[^\d]/g, '');

  // Build WhatsApp message
  const total = getCartTotal();
  const orderTime = formatOrderTime(new Date());

  let msg = `🍽 *NEW ORDER*\n\n`;
  msg += `*Customer Name:*\n${name}\n\n`;
  msg += `*Mobile:*\n${mobile}\n\n`;
  msg += `*Address:*\n${address}\n\n`;
  if (landmark) msg += `*Landmark:*\n${landmark}\n\n`;
  msg += `*Items:*\n`;
  cart.forEach(line => {
    msg += `• ${line.name} x${line.qty} — ₹${line.price * line.qty}\n`;
    if (line.customization) msg += `   _(${line.customization})_\n`;
  });
  msg += `\n*Total:*\n₹${total}\n\n`;
  msg += `*Order Time:*\n${orderTime}`;

  // Save order to localStorage (for owner dashboard analytics)
  const order = {
    id: 'ORD' + Date.now(),
    customerName: name,
    mobile: mobile,
    address: address,
    landmark: landmark,
    items: cart.map(l => ({ name: l.name, qty: l.qty, price: l.price, customization: l.customization, type: l.type, category: getMenuWithOverrides().find(m => m.id === l.id)?.category || '' })),
    total: total,
    timestamp: new Date().toISOString(),
    displayTime: orderTime
  };
  saveOrder(order);

  // Open WhatsApp
  const waUrl = `https://wa.me/${ownerWa}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');

  // Clear cart and show thank you
  clearCart();
  closeOrderModal();
  showThankYou();
}

function formatOrderTime(date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${day}-${month}-${year} ${String(h).padStart(2,'0')}:${min} ${ap}`;
}

// ===== THANK YOU SCREEN =====
function showThankYou() {
  document.getElementById('thankyou-screen').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function orderAgain() {
  document.getElementById('thankyou-screen').style.display = 'none';
  document.body.style.overflow = '';
}

// ===== MODAL HELPERS =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  hideOverlayIfNoModal();
  if (!anyModalOpen()) document.body.style.overflow = '';
}

function anyModalOpen() {
  return document.querySelector('.modal.open') || document.getElementById('cart-drawer').classList.contains('open');
}

function hideOverlayIfNoModal() {
  if (!anyModalOpen()) {
    document.getElementById('overlay').classList.remove('active');
  }
}

// ===== MOBILE NAV =====
function toggleMenu() {
  document.getElementById('nav-links').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('active');
}

function closeMenu() {
  document.getElementById('nav-links').classList.remove('open');
  document.getElementById('hamburger').classList.remove('active');
}

// ===== SCROLL EFFECTS =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 30) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// Close modals with Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
    closeItemModal();
    closeCustomizeModal();
    closeOrderModal();
  }
});

// ===== REAL-TIME REFRESH =====
// When the owner changes the menu / specials on any device, the shared DB
// fires this and the customer site updates without a manual reload.
function refreshCustomerView() {
  renderFilterTags();
  renderMenu();
  renderBestSellers();
  renderSpecials();
  updateCartUI();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  startSplash();
  applyConfig();
  renderFilterTags();
  renderMenu();
  renderBestSellers();
  renderSpecials();
  updateCartUI();
  if (typeof DB !== 'undefined') DB.onChange(refreshCustomerView);
  // Update open status every minute
  setInterval(updateOpenStatus, 60000);
});
