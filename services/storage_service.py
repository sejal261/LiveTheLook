import os
import time
from werkzeug.utils import secure_filename
from flask import current_app

def is_cloudinary_configured():
    cloud_name = current_app.config.get("CLOUDINARY_CLOUD_NAME")
    api_key = current_app.config.get("CLOUDINARY_API_KEY")
    api_secret = current_app.config.get("CLOUDINARY_API_SECRET")
    return bool(cloud_name and api_key and api_secret)

def save_image(file_obj, folder="interior_designs"):
    if not file_obj or file_obj.filename == "":
        return None

    filename = secure_filename(file_obj.filename)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in current_app.config["ALLOWED_EXTENSIONS"]:
        raise ValueError(f"File extension '.{ext}' is not allowed.")

    if is_cloudinary_configured():
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
            api_key=current_app.config["CLOUDINARY_API_KEY"],
            api_secret=current_app.config["CLOUDINARY_API_SECRET"]
        )

        upload_result = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type="image"
        )
        return upload_result.get("secure_url")
    else:
        # Fallback to local storage for local development
        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)

        timestamp_filename = f"{int(time.time())}_{filename}"
        file_path = os.path.join(upload_dir, timestamp_filename)
        file_obj.save(file_path)

        return f"/static/uploads/{timestamp_filename}"
