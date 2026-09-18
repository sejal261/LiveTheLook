from flask import Blueprint, render_template, request, redirect, url_for, flash, abort
from flask_login import login_required, current_user
from urllib.parse import urlparse
from models import db
from models.design import Design
from models.category import Category
from models.style import Style
from models.product import Product
from services.storage_service import save_image

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.before_request
@login_required
def ensure_admin():
    if not getattr(current_user, "is_admin", False):
        abort(403)

def sanitize_url(url_str):
    if not url_str:
        return ""
    url_str = url_str.strip()
    if not url_str.startswith(("http://", "https://")):
        url_str = f"https://{url_str}"
    parsed = urlparse(url_str)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return url_str
    return ""

@admin_bp.route("/", strict_slashes=False)
def dashboard():
    total_designs = Design.query.count()
    total_categories = Category.query.count()
    total_styles = Style.query.count()
    total_products = Product.query.count()
    recent_designs = Design.query.order_by(Design.created_at.desc()).limit(5).all()

    return render_template(
        "admin/dashboard.html",
        total_designs=total_designs,
        total_categories=total_categories,
        total_styles=total_styles,
        total_products=total_products,
        recent_designs=recent_designs
    )

@admin_bp.route("/designs", strict_slashes=False)
def designs_list():
    designs = Design.query.order_by(Design.created_at.desc()).all()
    return render_template("admin/designs_list.html", designs=designs)

@admin_bp.route("/design/add", methods=["GET", "POST"], strict_slashes=False)
def add_design():
    categories = Category.query.all()
    styles = Style.query.all()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        design_tips = request.form.get("design_tips", "").strip()
        category_id = request.form.get("category_id", type=int)
        style_id = request.form.get("style_id", type=int)
        is_featured = bool(request.form.get("is_featured"))

        image_file = request.files.get("image")

        if not title:
            flash("Design title is required.", "danger")
            return render_template("admin/design_form.html", categories=categories, styles=styles)

        if not category_id:
            flash("Please select a room category.", "danger")
            return render_template("admin/design_form.html", categories=categories, styles=styles)

        if not image_file or image_file.filename == "":
            flash("Please upload a main room design image.", "danger")
            return render_template("admin/design_form.html", categories=categories, styles=styles)

        try:
            image_url = save_image(image_file)
        except Exception as e:
            flash(f"Error uploading image: {str(e)}", "danger")
            return render_template("admin/design_form.html", categories=categories, styles=styles)

        design = Design(
            title=title,
            description=description,
            design_tips=design_tips,
            image_url=image_url,
            is_featured=is_featured,
            category_id=category_id,
            style_id=style_id if style_id else None
        )
        db.session.add(design)
        db.session.flush()

        # Process dynamic products
        product_names = request.form.getlist("product_name[]")
        product_urls = request.form.getlist("product_url[]")
        product_image_urls = request.form.getlist("product_image_url[]")
        product_descriptions = request.form.getlist("product_description[]")

        for i in range(len(product_names)):
            p_name = product_names[i].strip()
            p_url = sanitize_url(product_urls[i])
            p_img = product_image_urls[i].strip() if i < len(product_image_urls) else ""
            p_desc = product_descriptions[i].strip() if i < len(product_descriptions) else ""

            if p_name and p_url:
                product = Product(
                    design_id=design.id,
                    name=p_name,
                    url=p_url,
                    image_url=p_img or None,
                    description=p_desc or None
                )
                db.session.add(product)

        db.session.commit()
        flash(f"Design '{title}' created successfully!", "success")
        return redirect(url_for("admin.designs_list"))

    return render_template("admin/design_form.html", design=None, categories=categories, styles=styles)

@admin_bp.route("/design/edit/<int:design_id>", methods=["GET", "POST"], strict_slashes=False)
def edit_design(design_id):
    design = db.session.get(Design, design_id) or abort(404)
    categories = Category.query.all()
    styles = Style.query.all()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        design_tips = request.form.get("design_tips", "").strip()
        category_id = request.form.get("category_id", type=int)
        style_id = request.form.get("style_id", type=int)
        is_featured = bool(request.form.get("is_featured"))

        image_file = request.files.get("image")

        if not title:
            flash("Design title is required.", "danger")
            return render_template("admin/design_form.html", design=design, categories=categories, styles=styles)

        if not category_id:
            flash("Please select a room category.", "danger")
            return render_template("admin/design_form.html", design=design, categories=categories, styles=styles)

        if image_file and image_file.filename != "":
            try:
                new_image_url = save_image(image_file)
                if new_image_url:
                    design.image_url = new_image_url
            except Exception as e:
                flash(f"Error uploading new image: {str(e)}", "danger")
                return render_template("admin/design_form.html", design=design, categories=categories, styles=styles)

        design.title = title
        design.description = description
        design.design_tips = design_tips
        design.category_id = category_id
        design.style_id = style_id if style_id else None
        design.is_featured = is_featured

        # Replace product links
        Product.query.filter_by(design_id=design.id).delete()

        product_names = request.form.getlist("product_name[]")
        product_urls = request.form.getlist("product_url[]")
        product_image_urls = request.form.getlist("product_image_url[]")
        product_descriptions = request.form.getlist("product_description[]")

        for i in range(len(product_names)):
            p_name = product_names[i].strip()
            p_url = sanitize_url(product_urls[i])
            p_img = product_image_urls[i].strip() if i < len(product_image_urls) else ""
            p_desc = product_descriptions[i].strip() if i < len(product_descriptions) else ""

            if p_name and p_url:
                product = Product(
                    design_id=design.id,
                    name=p_name,
                    url=p_url,
                    image_url=p_img or None,
                    description=p_desc or None
                )
                db.session.add(product)

        db.session.commit()
        flash(f"Design '{title}' updated successfully!", "success")
        return redirect(url_for("admin.designs_list"))

    return render_template("admin/design_form.html", design=design, categories=categories, styles=styles)

@admin_bp.route("/design/delete/<int:design_id>", methods=["POST"], strict_slashes=False)
def delete_design(design_id):
    design = db.session.get(Design, design_id) or abort(404)
    title = design.title
    db.session.delete(design)
    db.session.commit()
    flash(f"Design '{title}' was deleted successfully.", "success")
    return redirect(url_for("admin.designs_list"))

@admin_bp.route("/categories", methods=["GET", "POST"], strict_slashes=False)
def manage_categories():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        slug = name.lower().replace(" ", "-")

        if name:
            existing = Category.query.filter((Category.name == name) | (Category.slug == slug)).first()
            if not existing:
                cat = Category(name=name, slug=slug, description=description)
                db.session.add(cat)
                db.session.commit()
                flash(f"Category '{name}' added successfully.", "success")
            else:
                flash("Category name already exists.", "warning")
        return redirect(url_for("admin.manage_categories"))

    categories = Category.query.all()
    return render_template("admin/categories.html", categories=categories)

@admin_bp.route("/styles", methods=["GET", "POST"], strict_slashes=False)
def manage_styles():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        slug = name.lower().replace(" ", "-")

        if name:
            existing = Style.query.filter((Style.name == name) | (Style.slug == slug)).first()
            if not existing:
                style = Style(name=name, slug=slug, description=description)
                db.session.add(style)
                db.session.commit()
                flash(f"Style '{name}' added successfully.", "success")
            else:
                flash("Style name already exists.", "warning")
        return redirect(url_for("admin.manage_styles"))

    styles = Style.query.all()
    return render_template("admin/styles.html", styles=styles)
