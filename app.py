import os
from flask import Flask
from flask_wtf.csrf import CSRFProtect
from config import Config
from models import db, login_manager
from routes.public import public_bp, chat_api
from routes.admin import admin_bp
from routes.auth import auth_bp

csrf = CSRFProtect()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    # Exempt public chatbot API from CSRF
    csrf.exempt(chat_api)

    # Register Blueprints
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(auth_bp)

    @app.context_processor
    def inject_global_vars():
        from models.category import Category
        from models.style import Style
        return {
            "all_categories": Category.query.all() if db.engine else [],
            "all_styles": Style.query.all() if db.engine else []
        }

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)