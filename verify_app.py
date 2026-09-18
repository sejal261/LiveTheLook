import os
import io
import json
import unittest
from app import create_app
from config import Config
from models import db
from models.user import User
from models.category import Category
from models.style import Style
from models.design import Design
from models.product import Product

class FlaskAppTestCase(unittest.TestCase):
    def setUp(self):
        app = create_app(Config)
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.app_context = app.app_context()
        self.app_context.push()
        self.client = app.test_client()

    def tearDown(self):
        self.app_context.pop()

    def test_home_page(self):
        print("Testing home page...")
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'InteriorCraft', response.data)
        self.assertIn(b'Shop By Room Type', response.data)

    def test_explore_page(self):
        print("Testing explore/gallery page...")
        response = self.client.get('/designs')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Shop Room Looks', response.data)

        # Test category filter
        response_cat = self.client.get('/designs?category=bedroom')
        self.assertEqual(response_cat.status_code, 200)

    def test_detail_page(self):
        print("Testing design detail page...")
        first_design = Design.query.first()
        if first_design:
            response = self.client.get(f'/design/{first_design.id}')
            self.assertEqual(response.status_code, 200)
            self.assertIn(first_design.title.encode(), response.data)

    def test_chat_endpoint(self):
        print("Testing AI Chatbot API...")
        response = self.client.post(
            '/api/chat',
            data=json.dumps({"message": "Tell me about Scandinavian bedroom layout recommendations"}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertIn('reply', data)
        self.assertTrue(isinstance(data['reply'], str) and len(data['reply']) > 20)

    def test_admin_auth_and_crud_flow(self):
        print("Testing admin authentication and CRUD operations...")
        # 1. Unauthenticated access to /admin should redirect to login
        resp_unauth = self.client.get('/admin/', follow_redirects=False)
        self.assertEqual(resp_unauth.status_code, 302)
        self.assertIn('/admin/login', resp_unauth.location)

        # 2. Login with valid credentials
        resp_login = self.client.post('/admin/login', data={
            'username': Config.ADMIN_USERNAME,
            'password': Config.ADMIN_PASSWORD
        }, follow_redirects=True)
        self.assertEqual(resp_login.status_code, 200)
        self.assertIn(b'Dashboard Overview', resp_login.data)

        # 3. Add a new design via Admin Form
        cat = Category.query.first()
        style = Style.query.first()
        img_data = (io.BytesIO(b"dummy image file data"), 'test_room.jpg')

        add_data = {
            'title': 'Test Cozy Coastal Balcony',
            'description': 'A beautiful test balcony layout with rattan seating.',
            'design_tips': 'Keep plants near sunlight and use waterproof wood furniture.',
            'category_id': cat.id if cat else 1,
            'style_id': style.id if style else 1,
            'is_featured': 'on',
            'image': img_data,
            'product_name[]': ['Rattan Chair', 'Outdoor Lantern'],
            'product_url[]': ['https://example.com/chair', 'https://example.com/lantern'],
            'product_image_url[]': ['', ''],
            'product_description[]': ['Comfortable chair', 'Warm light']
        }

        resp_add = self.client.post('/admin/design/add', data=add_data, content_type='multipart/form-data', follow_redirects=True)
        self.assertEqual(resp_add.status_code, 200)
        self.assertIn(b'created successfully', resp_add.data)

        # Verify saved in DB
        created_design = Design.query.filter_by(title='Test Cozy Coastal Balcony').first()
        self.assertIsNotNone(created_design)
        self.assertEqual(len(created_design.products), 2)

        # 4. Edit the design
        edit_data = {
            'title': 'Test Cozy Coastal Balcony Updated',
            'description': 'Updated description.',
            'design_tips': 'Updated tips.',
            'category_id': cat.id if cat else 1,
            'style_id': style.id if style else 1,
            'product_name[]': ['Updated Chair'],
            'product_url[]': ['https://example.com/updated-chair'],
            'product_image_url[]': [''],
            'product_description[]': ['Updated chair desc']
        }
        resp_edit = self.client.post(f'/admin/design/edit/{created_design.id}', data=edit_data, content_type='multipart/form-data', follow_redirects=True)
        self.assertEqual(resp_edit.status_code, 200)

        updated_design = db.session.get(Design, created_design.id)
        self.assertEqual(updated_design.title, 'Test Cozy Coastal Balcony Updated')
        self.assertEqual(len(updated_design.products), 1)

        # 5. Delete the design
        resp_del = self.client.post(f'/admin/design/delete/{created_design.id}', follow_redirects=True)
        self.assertEqual(resp_del.status_code, 200)

        deleted_design = db.session.get(Design, created_design.id)
        self.assertIsNone(deleted_design)
        print("Admin CRUD verification completed successfully!")

if __name__ == '__main__':
    unittest.main()
