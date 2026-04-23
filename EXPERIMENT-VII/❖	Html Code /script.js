if (typeof CSRF_TOKEN !== 'undefined') { return CSRF_TOKEN;
}
// Fallback: read from cookie const name = 'csrftoken';
const cookies = document.cookie.split(';'); for (let cookie of cookies) {
const [key, value] = cookie.trim().split('=');
if (key === name) return decodeURIComponent(value);
}
return '';
}


function showToast(message, type = 'success') {
const toast = document.getElementById('toast-message');
 
if (!toast) return; toast.textContent = message;
toast.className = `toast show ${type}`;


// Auto-hide after 3 seconds setTimeout(() => {
toast.classList.remove('show');
}, 3000);
}
function updateCartBadge(count) {
const badge = document.getElementById('cart-badge'); if (badge) {
badge.textContent = count;


// Hide badge if cart is empty if (count <= 0) {
badge.style.display = 'none';
} else {
badge.style.display = 'flex';
}
}
}
function addToCart(productId, productName) {
const button = document.getElementById(`btn-${productId}`); if (button) {
button.textContent = 'Adding...';
 
button.disabled = true;
}
fetch('/add-to-cart/', { method: 'POST', headers: {
'Content-Type': 'application/json',
'X-CSRFToken': getCsrfToken(), // Required by Django!
},
body: JSON.stringify({ product_id: productId }),
})
.then(response => response.json()) // Parse JSON response
.then(data => {
if (data.success) {
// Show success toast message
showToast(`✅ ${productName} added to cart!`, 'success'); updateCartBadge(data.cart_count);
if (button) {
button.textContent = 'Added ✓'; button.classList.add('added');

// Reset button after 2 seconds setTimeout(() => {
button.textContent = '+ Add to Cart'; button.classList.remove('added'); button.disabled = false;
}, 2000);
 
}
} else {
// Show error message
showToast(`❌ ${data.message}`, 'error'); if (button) {
button.textContent = '+ Add to Cart'; button.disabled = false;
}
}
})
.catch(error => {
// Network or other error console.error('Add to cart error:', error);
showToast('❌ Something went wrong. Please try again.', 'error'); if (button) {
button.textContent = '+ Add to Cart'; button.disabled = false;
}
});
}
function removeFromCart(productId) {


if (!confirm('Remove this item from your cart?')) return;


fetch('/remove-from-cart/', { method: 'POST',
 
headers: {
'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(),
},
body: JSON.stringify({ product_id: productId }),
})
.then(response => response.json())
.then(data => {
if (data.success) {
// Remove the item row from the DOM (no page reload!) const itemElement = document.getElementById(`cart-item-
${productId}`);
if (itemElement) {
// Fade out animation before removing itemElement.style.transition = 'opacity 0.3s, transform 0.3s'; itemElement.style.opacity = '0'; itemElement.style.transform = 'translateX(-20px)'; setTimeout(() => itemElement.remove(), 300);
}


updateCartTotal(data.cart_total, data.cart_count);


updateCartBadge(data.cart_count);


showToast(' Item removed from cart', 'success'); if (data.cart_count === 0) {
 
setTimeout(() => location.reload(), 800);
}
} else {
showToast(`❌ ${data.message}`, 'error');
}
})
.catch(error => {
console.error('Remove from cart error:', error); showToast('❌ Something went wrong.', 'error');
});
}
function updateCart(productId, action) { fetch('/update-cart/', {
method: 'POST', headers: {
'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(),
},
body: JSON.stringify({ product_id: productId, action: action }),
})
.then(response => response.json())
.then(data => {
if (data.success) {
if (data.removed) {
const itemElement = document.getElementById(`cart-item-
${productId}`);
 
if (itemElement) {
itemElement.style.transition = 'opacity 0.3s'; itemElement.style.opacity = '0';
setTimeout(() => itemElement.remove(), 300);
}
showToast(' Item removed from cart', 'success');


// Reload if cart is empty
if (data.cart_count === 0) {
setTimeout(() => location.reload(), 800);
}
} else {


const qtyDisplay = document.getElementById(`qty-${productId}`); if (qtyDisplay) {
qtyDisplay.textContent = data.quantity;
// Small bounce animation on quantity change qtyDisplay.style.transform = 'scale(1.4)';
setTimeout(() => { qtyDisplay.style.transform = 'scale(1)'; }, 200);
}
const itemTotal = document.getElementById(`item-total-
${productId}`);
if (itemTotal) {
itemTotal.textContent = `₹${data.item_total}`;
}
}
 
// Update the cart summary totals updateCartTotal(data.cart_total, data.cart_count); updateCartBadge(data.cart_count);
}
})
.catch(error => {
console.error('Update cart error:', error); showToast('❌ Something went wrong.', 'error');
});
}
function updateCartTotal(newTotal, itemCount) {
const summaryTotal = document.getElementById('summary-total'); if (summaryTotal) summaryTotal.textContent = `₹${newTotal}`; const grandTotal = document.getElementById('grand-total');
if (grandTotal) grandTotal.textContent = `₹${newTotal}`; const subtitle = document.querySelector('.section-subtitle'); if (subtitle && itemCount !== undefined) {
subtitle.textContent = `${itemCount} item(s) in your cart`;
}
}
document.addEventListener('DOMContentLoaded', function () {
// Hide badge if it shows "0"
const badge = document.getElementById('cart-badge');
if (badge && (badge.textContent === '0' || badge.textContent === '')) { badge.style.display = 'none';
 
}
const qtyDisplays = document.querySelectorAll('.qty-display'); qtyDisplays.forEach(el => {
el.style.transition = 'transform 0.2s ease';

 



});
 
});
console.log('✅ ShopEasy script.js loaded successfully!');
 

