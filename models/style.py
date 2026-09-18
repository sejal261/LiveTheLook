from models import db

class Style(db.Model):
    __tablename__ = "styles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    designs = db.relationship("Design", backref="style_rel", lazy=True)

    def __repr__(self):
        return f"<Style {self.name}>"
