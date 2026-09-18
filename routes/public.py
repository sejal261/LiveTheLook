from flask import Blueprint, render_template, request, jsonify, redirect, url_for, abort
from models import db
from models.design import Design
from models.category import Category
from models.style import Style
from services.chatbot_service import get_chatbot_response

public_bp = Blueprint("public", __name__)

@public_bp.route("/", strict_slashes=False)
def home():
    categories = Category.query.all()
    styles = Style.query.all()
    featured_designs = Design.query.filter_by(is_featured=True).order_by(Design.created_at.desc()).limit(6).all()
    if not featured_designs:
        featured_designs = Design.query.order_by(Design.created_at.desc()).limit(6).all()

    recent_designs = Design.query.order_by(Design.created_at.desc()).limit(6).all()
    total_designs_count = Design.query.count()

    return render_template(
        "public/index.html",
        categories=categories,
        styles=styles,
        featured_designs=featured_designs,
        recent_designs=recent_designs,
        total_designs_count=total_designs_count
    )

@public_bp.route("/designs", strict_slashes=False)
@public_bp.route("/explore", strict_slashes=False)
def explore():
    category_slug = request.args.get("category", "").strip().lower()
    style_slug = request.args.get("style", "").strip().lower()
    search_query = request.args.get("q", "").strip()

    categories = Category.query.all()
    styles = Style.query.all()

    query = Design.query

    selected_category = None
    if category_slug:
        selected_category = Category.query.filter(Category.slug == category_slug).first()
        if selected_category:
            query = query.filter(Design.category_id == selected_category.id)

    selected_style = None
    if style_slug:
        selected_style = Style.query.filter(Style.slug == style_slug).first()
        if selected_style:
            query = query.filter(Design.style_id == selected_style.id)

    if search_query:
        query = query.filter(
            (Design.title.ilike(f"%{search_query}%")) |
            (Design.description.ilike(f"%{search_query}%")) |
            (Design.design_tips.ilike(f"%{search_query}%"))
        )

    designs = query.order_by(Design.created_at.desc()).all()

    return render_template(
        "public/explore.html",
        designs=designs,
        categories=categories,
        styles=styles,
        selected_category=selected_category,
        selected_style=selected_style,
        search_query=search_query
    )

@public_bp.route("/design/<int:design_id>", strict_slashes=False)
def design_detail(design_id):
    design = db.session.get(Design, design_id) or abort(404)
    related_designs = Design.query.filter(
        Design.category_id == design.category_id,
        Design.id != design.id
    ).limit(3).all()

    return render_template(
        "public/detail.html",
        design=design,
        related_designs=related_designs
    )

@public_bp.route("/chat", methods=["POST"], strict_slashes=False)
@public_bp.route("/api/chat", methods=["POST"], strict_slashes=False)
def chat_api():
    # Public Chatbot API - exempt from CSRF restriction in app factory setup
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "")
    reply = get_chatbot_response(user_message)
    return jsonify({"reply": reply})

# Backward compatibility routes for legacy prototype URLs
@public_bp.route("/bedroom", strict_slashes=False)
@public_bp.route("/livingroom", strict_slashes=False)
@public_bp.route("/kitchen", strict_slashes=False)
@public_bp.route("/bathroom", strict_slashes=False)
@public_bp.route("/balcony", strict_slashes=False)
def legacy_category_redirect():
    cat = request.path.strip("/")
    return redirect(url_for("public.explore", category=cat))
