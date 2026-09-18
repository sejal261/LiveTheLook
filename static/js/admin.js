// Admin Dashboard Helper Scripts

function addProductRow() {
    const container = document.getElementById("productsContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
        <button type="button" class="remove-product-btn" onclick="removeProductRow(this)" title="Remove Product">
            <i class="fa-solid fa-trash"></i>
        </button>
        <div class="product-row-grid">
            <div class="form-group" style="margin-bottom:8px;">
                <label>Product Name *</label>
                <input type="text" name="product_name[]" class="form-control" placeholder="e.g. Modern Table Lamp" required>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Affiliate / Product URL *</label>
                <input type="url" name="product_url[]" class="form-control" placeholder="https://..." required>
            </div>
        </div>
        <div class="product-row-grid" style="margin-top:8px;">
            <div class="form-group" style="margin-bottom:0;">
                <label>Product Image URL (Optional)</label>
                <input type="text" name="product_image_url[]" class="form-control" placeholder="https://...">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Short Description (Optional)</label>
                <input type="text" name="product_description[]" class="form-control" placeholder="e.g. Warm LED accent lamp">
            </div>
        </div>
    `;
    container.appendChild(row);
}

function removeProductRow(btn) {
    const row = btn.closest(".product-row");
    if (row) {
        row.remove();
    }
}
