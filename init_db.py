import os
import json
from app import create_app
from config import Config
from models import db
from models.user import User
from models.category import Category
from models.style import Style
from models.design import Design
from models.product import Product

def seed_database():
    app = create_app(Config)
    with app.app_context():
        print("Creating database tables...")
        db.create_all()

        # 1. Create Default Admin User
        admin_username = Config.ADMIN_USERNAME
        admin_email = Config.ADMIN_EMAIL
        admin_password = Config.ADMIN_PASSWORD

        admin_user = User.query.filter_by(username=admin_username).first()
        if not admin_user:
            print(f"Creating default admin user: {admin_username}")
            admin_user = User(username=admin_username, email=admin_email, is_admin=True)
            admin_user.set_password(admin_password)
            db.session.add(admin_user)
            db.session.commit()

        # 2. Create Initial Categories
        default_categories = [
            {"name": "Bedroom", "slug": "bedroom", "description": "Restful, cozy, and private sanctuary bedroom designs."},
            {"name": "Living Room", "slug": "livingroom", "description": "Inviting, spacious living areas for relaxation and entertainment."},
            {"name": "Kitchen", "slug": "kitchen", "description": "Functional, modern culinary and dining spaces."},
            {"name": "Bathroom", "slug": "bathroom", "description": "Spa-like, sleek, and refreshing bathroom interiors."},
            {"name": "Balcony", "slug": "balcony", "description": "Outdoor balcony nooks, greenery, and relaxation spots."},
            {"name": "Other", "slug": "other", "description": "Home offices, hallways, dining rooms, and custom spaces."}
        ]

        cat_map = {}
        for cat_data in default_categories:
            cat = Category.query.filter_by(slug=cat_data["slug"]).first()
            if not cat:
                cat = Category(name=cat_data["name"], slug=cat_data["slug"], description=cat_data["description"])
                db.session.add(cat)
                db.session.commit()
            cat_map[cat_data["slug"]] = cat

        # 3. Create Initial Styles
        default_styles = [
            {"name": "Modern", "slug": "modern", "description": "Clean lines, sleek surfaces, neutral palettes, and minimal clutter."},
            {"name": "Minimalist", "slug": "minimalist", "description": "Essential beauty focusing on open space and essential furniture."},
            {"name": "Scandinavian", "slug": "scandinavian", "description": "Warm wooden accents, soft light tones, and cozy functional decor."},
            {"name": "Bohemian", "slug": "bohemian", "description": "Vibrant textiles, indoor plants, handcrafted patterns, and eclectic warmth."},
            {"name": "Industrial", "slug": "industrial", "description": "Exposed brick, metallic accents, raw concrete, and open architecture."},
            {"name": "Traditional", "slug": "traditional", "description": "Classic details, rich woods, symmetrical layouts, and timeless elegance."},
            {"name": "Contemporary", "slug": "contemporary", "description": "State-of-the-art curves, soft textures, and current design trends."}
        ]

        style_map = {}
        for style_data in default_styles:
            style = Style.query.filter_by(slug=style_data["slug"]).first()
            if not style:
                style = Style(name=style_data["name"], slug=style_data["slug"], description=style_data["description"])
                db.session.add(style)
                db.session.commit()
            style_map[style_data["slug"]] = style

        # 4. Migrate Prototype Metadata JSON Files into Database Records
        images_base = os.path.join(app.root_path, "static", "images")
        if os.path.exists(images_base):
            for category_folder in ["bedroom", "livingroom", "kitchen", "bathroom", "balcony"]:
                category_dir = os.path.join(images_base, category_folder)
                metadata_file = os.path.join(category_dir, "metadata.json")

                if os.path.exists(metadata_file):
                    try:
                        with open(metadata_file, "r", encoding="utf-8") as f:
                            metadata = json.load(f)
                    except Exception as e:
                        print(f"Error reading metadata for {category_folder}: {e}")
                        metadata = {}

                    category_obj = cat_map.get(category_folder) or cat_map["other"]

                    for filename, details in metadata.items():
                        image_relative_path = f"/static/images/{category_folder}/{filename}"
                        existing_design = Design.query.filter_by(image_url=image_relative_path).first()

                        if not existing_design:
                            title = details.get("title", filename.rsplit(".", 1)[0].replace("-", " ").title())
                            description = details.get("description", "No description provided.")

                            # Infer style from title/description
                            chosen_style = style_map.get("modern")
                            text_check = (title + " " + description).lower()
                            for s_slug, s_obj in style_map.items():
                                if s_slug in text_check or s_obj.name.lower() in text_check:
                                    chosen_style = s_obj
                                    break

                            tips = f"Focus on maintaining cohesive color tones and utilizing scale-appropriate furniture to highlight the natural light of this {category_folder} design."

                            new_design = Design(
                                title=title,
                                description=description,
                                design_tips=tips,
                                image_url=image_relative_path,
                                is_featured=True,
                                category_id=category_obj.id,
                                style_id=chosen_style.id if chosen_style else None
                            )
                            db.session.add(new_design)
                            db.session.flush()

                            # Add product links
                            product_links = details.get("product_links", [])
                            for prod in product_links:
                                p_name = prod.get("name")
                                p_url = prod.get("url")
                                if p_name and p_url:
                                    p_obj = Product(
                                        design_id=new_design.id,
                                        name=p_name,
                                        url=p_url
                                    )
                                    db.session.add(p_obj)

                            db.session.commit()
                            print(f"Migrated design: '{title}' into database.")

        print("Database initialization and seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
