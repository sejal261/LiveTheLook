import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data structures
let categories = [
  { id: 1, name: "Bedroom", slug: "bedroom", description: "Restful, cozy, and private sanctuary bedroom designs." },
  { id: 2, name: "Living Room", slug: "livingroom", description: "Inviting, spacious living areas for relaxation and entertainment." },
  { id: 3, name: "Kitchen", slug: "kitchen", description: "Functional, modern culinary and dining spaces." },
  { id: 4, name: "Bathroom", slug: "bathroom", description: "Spa-like, sleek, and refreshing bathroom interiors." },
  { id: 5, name: "Balcony", slug: "balcony", description: "Outdoor balcony nooks, greenery, and relaxation spots." },
  { id: 6, name: "Other", slug: "other", description: "Home offices, hallways, dining rooms, and custom spaces." }
];

let styles = [
  { id: 1, name: "Modern", slug: "modern", description: "Clean lines, sleek surfaces, neutral palettes, and minimal clutter." },
  { id: 2, name: "Minimalist", slug: "minimalist", description: "Essential beauty focusing on open space and essential furniture." },
  { id: 3, name: "Scandinavian", slug: "scandinavian", description: "Warm wooden accents, soft light tones, and cozy functional decor." },
  { id: 4, name: "Bohemian", slug: "bohemian", description: "Vibrant textiles, indoor plants, handcrafted patterns, and eclectic warmth." },
  { id: 5, name: "Industrial", slug: "industrial", description: "Exposed brick, metallic accents, raw concrete, and open architecture." },
  { id: 6, name: "Traditional", slug: "traditional", description: "Classic details, rich woods, symmetrical layouts, and timeless elegance." },
  { id: 7, name: "Contemporary", slug: "contemporary", description: "State-of-the-art curves, soft textures, and current design trends." }
];

let nextCategoryId = 7;
let nextStyleId = 8;
let nextDesignId = 1;
let nextProductId = 1;

let designs = [];
let products = [];

// Admin user record
const adminUser = {
  id: 1,
  username: process.env.ADMIN_USERNAME || "admin",
  email: process.env.ADMIN_EMAIL || "admin@livethelook.com",
  password: process.env.ADMIN_PASSWORD || "adminpassword",
  isAdmin: true
};

// Seed initial designs from image metadata
function seedInitialData() {
  const imagesBase = path.join(__dirname, "static", "images");
  const folderCategories = ["bedroom", "livingroom", "kitchen", "bathroom", "balcony"];

  for (const folder of folderCategories) {
    const metaPath = path.join(imagesBase, folder, "metadata.json");
    if (!fs.existsSync(metaPath)) continue;

    try {
      const raw = fs.readFileSync(metaPath, "utf-8");
      const metadata = JSON.parse(raw);
      const cat = categories.find(c => c.slug === folder) || categories[0];

      for (const [filename, details] of Object.entries(metadata)) {
        const title = details.title || filename.replace(/[-_]/g, " ").replace(/\.\w+$/, "").replace(/\b\w/g, c => c.toUpperCase());
        const description = details.description || "Curated interior room look with direct shopping links.";
        
        // Infer style
        let chosenStyle = styles.find(s => s.slug === "modern");
        const lowerText = `${title} ${description}`.toLowerCase();
        for (const s of styles) {
          if (lowerText.includes(s.slug) || lowerText.includes(s.name.toLowerCase())) {
            chosenStyle = s;
            break;
          }
        }

        const designId = nextDesignId++;
        const tips = `Focus on maintaining cohesive color tones, using warm layered lighting, and selecting scale-appropriate furniture to highlight the natural layout of this ${cat.name} look.`;
        const imageUrl = `/static/images/${folder}/${filename}`;

        const designProducts = [];
        if (Array.isArray(details.product_links)) {
          for (const p of details.product_links) {
            if (p.name && p.url) {
              const prod = {
                id: nextProductId++,
                design_id: designId,
                name: p.name,
                url: p.url,
                description: p.description || null,
                imageUrl: p.imageUrl || null
              };
              products.push(prod);
              designProducts.push(prod);
            }
          }
        }

        designs.push({
          id: designId,
          title,
          description,
          design_tips: tips,
          image_url: imageUrl,
          is_featured: true,
          category_id: cat.id,
          style_id: chosenStyle ? chosenStyle.id : null,
          created_at: new Date(Date.now() - designs.length * 3600000)
        });
      }
    } catch (err) {
      console.warn(`Could not load metadata for ${folder}:`, err.message);
    }
  }

  // If no designs were loaded (e.g. empty metadata), add fallback showcase designs
  if (designs.length === 0) {
    const defaultDesigns = [
      {
        title: "Modern Scandinavian Bedroom",
        description: "A calming blend of soft neutrals, crisp white linens, and warm wooden tones creating an airy, peaceful sanctuary.",
        design_tips: "Layer textured throws and low-profile lamps to introduce soft dimension without visual clutter.",
        image_url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1200&auto=format&fit=crop",
        category_id: 1,
        style_id: 3,
        is_featured: true,
        products: [
          { name: "Linen Duvet Cover", url: "https://amazon.com" },
          { name: "Oak Bedside Table", url: "https://amazon.com" },
          { name: "Warm Ambient Pendant", url: "https://amazon.com" }
        ]
      },
      {
        title: "Warm Minimalist Living Room",
        description: "Neutral beige sectional with natural wood accents, textured jute rug, and layered warm ambient lighting.",
        design_tips: "Keep floor space open and allow large windows to be the architectural hero of the room.",
        image_url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop",
        category_id: 2,
        style_id: 2,
        is_featured: true,
        products: [
          { name: "Cream Sectional Sofa", url: "https://amazon.com" },
          { name: "Solid Wood Coffee Table", url: "https://amazon.com" },
          { name: "Braided Jute Area Rug", url: "https://amazon.com" }
        ]
      }
    ];

    for (const d of defaultDesigns) {
      const designId = nextDesignId++;
      designs.push({
        id: designId,
        title: d.title,
        description: d.description,
        design_tips: d.design_tips,
        image_url: d.image_url,
        is_featured: true,
        category_id: d.category_id,
        style_id: d.style_id,
        created_at: new Date()
      });
      for (const p of d.products) {
        products.push({
          id: nextProductId++,
          design_id: designId,
          name: p.name,
          url: p.url
        });
      }
    }
  }

  console.log(`Database seeded with ${categories.length} categories, ${styles.length} styles, and ${designs.length} shoppable designs.`);
}

// Helper to attach relations
function enrichDesign(design) {
  if (!design) return null;
  const cat = categories.find(c => c.id === design.category_id);
  const sty = styles.find(s => s.id === design.style_id);
  const prods = products.filter(p => p.design_id === design.id);

  return {
    ...design,
    category_name: cat ? cat.name : "Uncategorized",
    category_slug: cat ? cat.slug : "other",
    category_rel: cat || null,
    style_name: sty ? sty.name : "Eclectic",
    style_slug: sty ? sty.slug : "modern",
    style_rel: sty || null,
    products: prods
  };
}

export const db = {
  // Categories
  getCategories() {
    return categories.map(cat => ({
      ...cat,
      designs: designs.filter(d => d.category_id === cat.id)
    }));
  },
  getCategoryBySlug(slug) {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) return null;
    return {
      ...cat,
      designs: designs.filter(d => d.category_id === cat.id)
    };
  },
  getCategoryById(id) {
    return categories.find(c => c.id === Number(id)) || null;
  },
  createCategory({ name, description }) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const existing = categories.find(c => c.slug === slug || c.name.toLowerCase() === name.toLowerCase());
    if (existing) return { error: "Category already exists", category: existing };
    const newCat = {
      id: nextCategoryId++,
      name: name.trim(),
      slug,
      description: description ? description.trim() : ""
    };
    categories.push(newCat);
    return { category: newCat };
  },

  // Styles
  getStyles() {
    return styles.map(st => ({
      ...st,
      designs: designs.filter(d => d.style_id === st.id)
    }));
  },
  getStyleBySlug(slug) {
    const st = styles.find(s => s.slug === slug);
    if (!st) return null;
    return {
      ...st,
      designs: designs.filter(d => d.style_id === st.id)
    };
  },
  getStyleById(id) {
    return styles.find(s => s.id === Number(id)) || null;
  },
  createStyle({ name, description }) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const existing = styles.find(s => s.slug === slug || s.name.toLowerCase() === name.toLowerCase());
    if (existing) return { error: "Style already exists", style: existing };
    const newStyle = {
      id: nextStyleId++,
      name: name.trim(),
      slug,
      description: description ? description.trim() : ""
    };
    styles.push(newStyle);
    return { style: newStyle };
  },

  // Designs
  getDesigns({ categorySlug, styleSlug, searchQuery, limit, featuredOnly } = {}) {
    let result = designs.slice();

    if (categorySlug) {
      const cat = categories.find(c => c.slug === categorySlug.toLowerCase());
      if (cat) {
        result = result.filter(d => d.category_id === cat.id);
      }
    }

    if (styleSlug) {
      const sty = styles.find(s => s.slug === styleSlug.toLowerCase());
      if (sty) {
        result = result.filter(d => d.style_id === sty.id);
      }
    }

    if (featuredOnly) {
      result = result.filter(d => d.is_featured);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.design_tips && d.design_tips.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result.map(enrichDesign);
  },

  getDesignById(id) {
    const design = designs.find(d => d.id === Number(id));
    return design ? enrichDesign(design) : null;
  },

  getRelatedDesigns(designId, categoryId, limit = 3) {
    return designs
      .filter(d => d.category_id === categoryId && d.id !== Number(designId))
      .slice(0, limit)
      .map(enrichDesign);
  },

  createDesign({ title, description, design_tips, image_url, category_id, style_id, is_featured, product_links = [] }) {
    const designId = nextDesignId++;
    const newDesign = {
      id: designId,
      title: title.trim(),
      description: description ? description.trim() : "",
      design_tips: design_tips ? design_tips.trim() : "",
      image_url: image_url || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop",
      is_featured: Boolean(is_featured),
      category_id: Number(category_id),
      style_id: style_id ? Number(style_id) : null,
      created_at: new Date()
    };
    designs.push(newDesign);

    for (const p of product_links) {
      if (p.name && p.url) {
        products.push({
          id: nextProductId++,
          design_id: designId,
          name: p.name.trim(),
          url: p.url.trim(),
          image_url: p.image_url ? p.image_url.trim() : null,
          description: p.description ? p.description.trim() : null
        });
      }
    }

    return enrichDesign(newDesign);
  },

  updateDesign(id, { title, description, design_tips, image_url, category_id, style_id, is_featured, product_links }) {
    const idx = designs.findIndex(d => d.id === Number(id));
    if (idx === -1) return null;

    designs[idx] = {
      ...designs[idx],
      title: title !== undefined ? title.trim() : designs[idx].title,
      description: description !== undefined ? description.trim() : designs[idx].description,
      design_tips: design_tips !== undefined ? design_tips.trim() : designs[idx].design_tips,
      image_url: image_url || designs[idx].image_url,
      category_id: category_id !== undefined ? Number(category_id) : designs[idx].category_id,
      style_id: style_id !== undefined ? (style_id ? Number(style_id) : null) : designs[idx].style_id,
      is_featured: is_featured !== undefined ? Boolean(is_featured) : designs[idx].is_featured
    };

    if (Array.isArray(product_links)) {
      // Remove existing products
      products = products.filter(p => p.design_id !== Number(id));
      // Insert updated
      for (const p of product_links) {
        if (p.name && p.url) {
          products.push({
            id: nextProductId++,
            design_id: Number(id),
            name: p.name.trim(),
            url: p.url.trim(),
            image_url: p.image_url ? p.image_url.trim() : null,
            description: p.description ? p.description.trim() : null
          });
        }
      }
    }

    return enrichDesign(designs[idx]);
  },

  deleteDesign(id) {
    const idx = designs.findIndex(d => d.id === Number(id));
    if (idx === -1) return false;
    const removed = designs.splice(idx, 1)[0];
    products = products.filter(p => p.design_id !== Number(id));
    return removed;
  },

  // Auth & Stats
  verifyAdmin(username, password) {
    if (!username || !password) return null;
    const cleanUser = username.trim().toLowerCase();
    if (
      (cleanUser === adminUser.username.toLowerCase() || cleanUser === adminUser.email.toLowerCase()) &&
      password === adminUser.password
    ) {
      return adminUser;
    }
    return null;
  },

  getAdminUser() {
    return adminUser;
  },

  getStats() {
    return {
      total_designs: designs.length,
      total_categories: categories.length,
      total_styles: styles.length,
      total_products: products.length
    };
  }
};

// Auto seed on import
seedInitialData();
