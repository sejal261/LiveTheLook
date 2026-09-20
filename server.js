import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { db } from './db.js';
import { getChatbotResponse } from './services/chatbot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'static', 'images', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for admin image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving
app.use('/static', express.static(path.join(__dirname, 'static')));

// Global template context middleware
app.use((req, res, next) => {
  const isAdmin = Boolean(req.cookies && req.cookies.admin_session);
  res.locals.current_user = isAdmin ? db.getAdminUser() : null;
  res.locals.current_path = req.path;
  res.locals.all_categories = db.getCategories();
  res.locals.all_styles = db.getStyles();

  // Simple flash messages via cookie
  const flashCookie = req.cookies && req.cookies.flash_msg;
  if (flashCookie) {
    try {
      res.locals.flash_messages = [JSON.parse(flashCookie)];
    } catch {
      res.locals.flash_messages = [];
    }
    res.clearCookie('flash_msg');
  } else {
    res.locals.flash_messages = [];
  }

  // Flash message helper
  res.flash = (text, type = 'info') => {
    res.cookie('flash_msg', JSON.stringify({ text, type }), { maxAge: 10000, httpOnly: true });
  };

  next();
});

// Admin authentication guard
function requireAdmin(req, res, next) {
  if (!req.cookies || !req.cookies.admin_session) {
    return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Home Page
app.get('/', (req, res) => {
  const categories = db.getCategories();
  const styles = db.getStyles();
  const featured_designs = db.getDesigns({ featuredOnly: true, limit: 6 });
  const recent_designs = db.getDesigns({ limit: 6 });
  const stats = db.getStats();

  res.render('public/index', {
    title: 'Shop The Look — Interior Room Designs & Direct Product Links',
    categories,
    styles,
    featured_designs: featured_designs.length ? featured_designs : recent_designs,
    recent_designs,
    total_designs_count: stats.total_designs
  });
});

// Explore & Search
app.get(['/explore', '/designs'], (req, res) => {
  const category_slug = (req.query.category || '').trim().toLowerCase();
  const style_slug = (req.query.style || '').trim().toLowerCase();
  const search_query = (req.query.q || '').trim();

  const categories = db.getCategories();
  const styles = db.getStyles();
  const selected_category = category_slug ? db.getCategoryBySlug(category_slug) : null;
  const selected_style = style_slug ? db.getStyleBySlug(style_slug) : null;

  const designs = db.getDesigns({
    categorySlug: category_slug,
    styleSlug: style_slug,
    searchQuery: search_query
  });

  res.render('public/explore', {
    title: 'Shop Room Looks — Direct Product Links & Decor Guides',
    designs,
    categories,
    styles,
    selected_category,
    selected_style,
    category_slug,
    style_slug,
    search_query
  });
});

// Design Detail
app.get('/design/:id', (req, res) => {
  const design = db.getDesignById(req.params.id);
  if (!design) {
    return res.status(404).render('public/explore', {
      title: 'Design Not Found',
      designs: db.getDesigns({ limit: 6 }),
      categories: db.getCategories(),
      styles: db.getStyles(),
      selected_category: null,
      selected_style: null,
      category_slug: '',
      style_slug: '',
      search_query: ''
    });
  }

  const related_designs = db.getRelatedDesigns(design.id, design.category_id, 3);

  res.render('public/detail', {
    title: `Shop The Look: ${design.title} — Direct Product Links`,
    design,
    related_designs
  });
});

// Chatbot API (both /api/chat and /chat endpoints)
app.post(['/api/chat', '/chat'], async (req, res) => {
  try {
    const userMessage = (req.body && req.body.message) || '';
    const reply = await getChatbotResponse(userMessage);
    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ reply: 'Sorry, I encountered an error while processing your design query.' });
  }
});

// Legacy category redirect routes
app.get(['/bedroom', '/livingroom', '/kitchen', '/bathroom', '/balcony'], (req, res) => {
  const cat = req.path.replace(/^\//, '');
  res.redirect(`/explore?category=${cat}`);
});

// ==========================================
// AUTH ROUTES
// ==========================================

app.get('/admin/login', (req, res) => {
  if (req.cookies && req.cookies.admin_session) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { title: 'Admin Login — InteriorCraft' });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.verifyAdmin(username, password);

  if (user) {
    res.cookie('admin_session', 'true', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.flash('Welcome back, Administrator!', 'success');
    const nextUrl = req.query.next || '/admin';
    return res.redirect(nextUrl);
  }

  res.flash('Invalid username or password. Please try again.', 'danger');
  res.render('admin/login', { title: 'Admin Login — InteriorCraft' });
});

app.get('/admin/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.flash('You have been logged out securely.', 'info');
  res.redirect('/admin/login');
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Dashboard
app.get('/admin', requireAdmin, (req, res) => {
  const stats = db.getStats();
  const recent_designs = db.getDesigns({ limit: 5 });

  res.render('admin/dashboard', {
    title: 'Admin Dashboard — InteriorCraft',
    total_designs: stats.total_designs,
    total_categories: stats.total_categories,
    total_styles: stats.total_styles,
    total_products: stats.total_products,
    recent_designs
  });
});

// Manage Designs List
app.get('/admin/designs', requireAdmin, (req, res) => {
  const designs = db.getDesigns();
  res.render('admin/designs_list', {
    title: 'Manage Designs — Admin Dashboard',
    designs
  });
});

// Add Design Form & Submit
app.get('/admin/design/add', requireAdmin, (req, res) => {
  res.render('admin/design_form', {
    title: 'Add New Design — Admin Dashboard',
    design: null,
    categories: db.getCategories(),
    styles: db.getStyles()
  });
});

app.post('/admin/design/add', requireAdmin, upload.single('image'), (req, res) => {
  const { title, description, design_tips, category_id, style_id, is_featured, image_url } = req.body;

  let finalImageUrl = image_url;
  if (req.file) {
    finalImageUrl = `/static/images/uploads/${req.file.filename}`;
  }
  if (!finalImageUrl) {
    finalImageUrl = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop';
  }

  // Parse product links
  const names = Array.isArray(req.body['product_name[]']) ? req.body['product_name[]'] : [req.body['product_name[]'] || ''];
  const urls = Array.isArray(req.body['product_url[]']) ? req.body['product_url[]'] : [req.body['product_url[]'] || ''];
  const descs = Array.isArray(req.body['product_description[]']) ? req.body['product_description[]'] : [req.body['product_description[]'] || ''];

  const product_links = [];
  for (let i = 0; i < names.length; i++) {
    const pName = (names[i] || '').trim();
    const pUrl = (urls[i] || '').trim();
    if (pName && pUrl) {
      product_links.push({
        name: pName,
        url: pUrl.startsWith('http') ? pUrl : `https://${pUrl}`,
        description: (descs[i] || '').trim() || null
      });
    }
  }

  const newDesign = db.createDesign({
    title: title || 'Curated Room Look',
    description,
    design_tips,
    image_url: finalImageUrl,
    category_id: category_id || 1,
    style_id: style_id || null,
    is_featured: Boolean(is_featured),
    product_links
  });

  res.flash(`Design '${newDesign.title}' created successfully!`, 'success');
  res.redirect('/admin/designs');
});

// Edit Design Form & Submit
app.get('/admin/design/edit/:id', requireAdmin, (req, res) => {
  const design = db.getDesignById(req.params.id);
  if (!design) {
    res.flash('Design not found.', 'danger');
    return res.redirect('/admin/designs');
  }

  res.render('admin/design_form', {
    title: `Edit Design: ${design.title} — Admin`,
    design,
    categories: db.getCategories(),
    styles: db.getStyles()
  });
});

app.post('/admin/design/edit/:id', requireAdmin, upload.single('image'), (req, res) => {
  const { title, description, design_tips, category_id, style_id, is_featured, image_url } = req.body;

  let finalImageUrl = image_url;
  if (req.file) {
    finalImageUrl = `/static/images/uploads/${req.file.filename}`;
  }

  const names = Array.isArray(req.body['product_name[]']) ? req.body['product_name[]'] : [req.body['product_name[]'] || ''];
  const urls = Array.isArray(req.body['product_url[]']) ? req.body['product_url[]'] : [req.body['product_url[]'] || ''];
  const descs = Array.isArray(req.body['product_description[]']) ? req.body['product_description[]'] : [req.body['product_description[]'] || ''];

  const product_links = [];
  for (let i = 0; i < names.length; i++) {
    const pName = (names[i] || '').trim();
    const pUrl = (urls[i] || '').trim();
    if (pName && pUrl) {
      product_links.push({
        name: pName,
        url: pUrl.startsWith('http') ? pUrl : `https://${pUrl}`,
        description: (descs[i] || '').trim() || null
      });
    }
  }

  const updated = db.updateDesign(req.params.id, {
    title,
    description,
    design_tips,
    image_url: finalImageUrl,
    category_id,
    style_id,
    is_featured: Boolean(is_featured),
    product_links
  });

  if (updated) {
    res.flash(`Design '${updated.title}' updated successfully!`, 'success');
  } else {
    res.flash('Failed to update design.', 'danger');
  }
  res.redirect('/admin/designs');
});

// Delete Design
app.post('/admin/design/delete/:id', requireAdmin, (req, res) => {
  const deleted = db.deleteDesign(req.params.id);
  if (deleted) {
    res.flash(`Design '${deleted.title}' was deleted successfully.`, 'success');
  }
  res.redirect('/admin/designs');
});

// Manage Categories
app.get('/admin/categories', requireAdmin, (req, res) => {
  res.render('admin/categories', {
    title: 'Manage Categories — Admin Dashboard',
    categories: db.getCategories()
  });
});

app.post('/admin/categories', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (name && name.trim()) {
    const result = db.createCategory({ name, description });
    if (result.error) {
      res.flash(result.error, 'danger');
    } else {
      res.flash(`Category '${result.category.name}' added successfully.`, 'success');
    }
  }
  res.redirect('/admin/categories');
});

// Manage Styles
app.get('/admin/styles', requireAdmin, (req, res) => {
  res.render('admin/styles', {
    title: 'Manage Styles — Admin Dashboard',
    styles: db.getStyles()
  });
});

app.post('/admin/styles', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (name && name.trim()) {
    const result = db.createStyle({ name, description });
    if (result.error) {
      res.flash(result.error, 'danger');
    } else {
      res.flash(`Style '${result.style.name}' added successfully.`, 'success');
    }
  }
  res.redirect('/admin/styles');
});

// Start Server on Port 3000, 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LiveTheLook server listening at http://0.0.0.0:${PORT}`);
});
