// ===== CART STATE & LOGIC =====
let cart = JSON.parse(localStorage.getItem('srgrand_cart') || '[]');

function saveCart() {
  localStorage.setItem('srgrand_cart', JSON.stringify(cart));
  updateCartUI();
}

// Each cart line is unique by item id + customization string,
// so "Chicken 65 - Less Spicy" and "Chicken 65 - Extra Onion" are separate lines.
function cartLineKey(itemId, customization) {
  return itemId + '||' + (customization || '');
}

function addToCart(itemId, customization) {
  const item = getMenuWithOverrides().find(i => i.id === itemId);
  if (!item || item.status !== 'available') return;

  const key = cartLineKey(itemId, customization);
  const existing = cart.find(c => c.key === key);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key: key,
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      type: item.type,
      customization: customization || '',
      qty: 1
    });
  }
  saveCart();
  showToast(`${item.name} added to cart`);
}

function changeQty(key, delta) {
  const line = cart.find(c => c.key === key);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) {
    cart = cart.filter(c => c.key !== key);
  }
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  cart = cart.filter(c => c.key !== key);
  saveCart();
  renderCart();
}

function getCartTotal() {
  return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, c) => sum + c.qty, 0);
}

function clearCart() {
  cart = [];
  saveCart();
}

function updateCartUI() {
  const count = getCartCount();
  const cartCountEl = document.getElementById('cart-count');
  const fabCountEl = document.getElementById('fab-cart-count');
  if (cartCountEl) cartCountEl.textContent = count;
  if (fabCountEl) fabCountEl.textContent = count;

  // Update "in cart" state on menu add buttons
  document.querySelectorAll('.btn-add[data-item-id]').forEach(btn => {
    const id = parseInt(btn.getAttribute('data-item-id'));
    const inCart = cart.some(c => c.id === id);
    if (inCart) {
      btn.classList.add('in-cart');
      btn.innerHTML = '✓ Added';
    } else {
      btn.classList.remove('in-cart');
      btn.innerHTML = '+ Add';
    }
  });
}

function renderCart() {
  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');
  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <p>Your cart is empty.<br>Add some delicious dishes!</p>
        <button class="btn-primary" onclick="closeCart()">Browse Menu</button>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = cart.map(line => `
    <div class="cart-item">
      <div class="cart-item-img"><img src="${line.image}" alt="${line.name}"></div>
      <div class="cart-item-details">
        <div class="cart-item-name">${line.name}</div>
        ${line.customization ? `<div class="cart-item-custom">📝 ${line.customization}</div>` : ''}
        <div class="cart-item-price">₹${line.price} × ${line.qty} = ₹${line.price * line.qty}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty('${line.key}', -1)">−</button>
        <span class="qty-num">${line.qty}</span>
        <button class="qty-btn" onclick="changeQty('${line.key}', 1)">+</button>
      </div>
    </div>
  `).join('');

  footer.style.display = 'block';
  document.getElementById('cart-total-amount').textContent = '₹' + getCartTotal();
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#2E7D32;color:white;padding:12px 24px;border-radius:50px;font-size:0.88rem;font-weight:500;z-index:3000;box-shadow:0 6px 20px rgba(0,0,0,0.25);opacity:0;transition:all 0.3s ease;pointer-events:none;max-width:90vw;text-align:center;';
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ ' + msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2200);
}
