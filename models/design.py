from datetime import datetime
from models import db

class Design(db.Model):
    __tablename__ = "designs"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    design_tips = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=False)
    is_featured = db.Column(db.Boolean, default=False)
    
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    style_id = db.Column(db.Integer, db.ForeignKey("styles.id"), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = db.relationship("Product", backref="design", cascade="all, delete-orphan", lazy=True)

    @property
    def category_name(self):
        return self.category_rel.name if self.category_rel else "Uncategorized"

    @property
    def style_name(self):
        return self.style_rel.name if self.style_rel else "General"

    def __repr__(self):
        return f"<Design {self.title}>"
