from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from models.user import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/admin/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("admin.dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        remember = bool(request.form.get("remember"))

        user = User.query.filter((User.username == username) | (User.email == username)).first()

        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.args.get("next")
            flash("Welcome back, Administrator!", "success")
            return redirect(next_page or url_for("admin.dashboard"))
        else:
            flash("Invalid username or password. Please try again.", "danger")

    return render_template("admin/login.html")

@auth_bp.route("/admin/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out securely.", "info")
    return redirect(url_for("auth.login"))
