from models import db

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    designs = db.relationship("Design", backref="category_rel", lazy=True)

    def __repr__(self):
        return f"<Category {self.name}>"
