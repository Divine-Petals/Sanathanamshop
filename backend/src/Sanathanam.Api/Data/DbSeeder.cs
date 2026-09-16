using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Sanathanam.Api.Domain;

namespace Sanathanam.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IHostEnvironment env)
    {
        if (!await db.Tenants.AnyAsync())
        {
            await SeedInitialAsync(db, config, env);
            return;
        }

        await SyncBrandTenantsAsync(db);
        await EnsurePerSiteCatalogAsync(db);
    }

    private static async Task SeedInitialAsync(AppDbContext db, IConfiguration config, IHostEnvironment env)
    {
        var divine = TenantDefs.DivinePetals();
        var jewels = TenantDefs.DivineJewels();
        var sanathanam = TenantDefs.Sanathanam();
        db.Tenants.AddRange(divine, jewels, sanathanam);

        SeedCatalogForTenant(db, divine, CatalogDefs.PetalsCategories, CatalogDefs.PetalsSubcategories, CatalogDefs.PetalsProducts());
        SeedCatalogForTenant(db, jewels, CatalogDefs.JewelsCategories, CatalogDefs.JewelsSubcategories, CatalogDefs.JewelsProducts());
        SeedCatalogForTenant(db, sanathanam, CatalogDefs.SanathanamCategories, CatalogDefs.SanathanamSubcategories, CatalogDefs.SanathanamProducts());

        var email = config["Admin:Email"] ?? "admin@sanathanam.local";
        var password = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(password))
        {
            if (!env.IsDevelopment())
                throw new InvalidOperationException(
                    "Production first-boot requires Admin:Password (do not use the default).");
            password = "Admin@123";
        }
        else if (!env.IsDevelopment() && password == "Admin@123")
        {
            throw new InvalidOperationException(
                "Production refuses the default Admin@123 password. Set Admin:Password to a strong value.");
        }

        db.Admins.Add(new AdminUser
        {
            Id = Guid.NewGuid(),
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            TenantId = null
        });

        await db.SaveChangesAsync();
    }

    public static async Task SyncBrandTenantsAsync(AppDbContext db)
    {
        var legacyJewels = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == "petal-haus");
        if (legacyJewels is not null)
        {
            ApplyDef(legacyJewels, TenantDefs.DivineJewels());
            legacyJewels.Slug = "divine-jewels";
            legacyJewels.ThemeKey = "divine-jewels";
        }

        var legacySanathanam = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == "ayur-leaf");
        if (legacySanathanam is not null)
        {
            ApplyDef(legacySanathanam, TenantDefs.Sanathanam());
            legacySanathanam.Slug = "sanathanam";
            legacySanathanam.ThemeKey = "sanathanam";
        }

        if (await db.Tenants.FirstOrDefaultAsync(t => t.Slug == "divine-petals") is Tenant petals)
            ApplyDef(petals, TenantDefs.DivinePetals());

        if (await db.Tenants.FirstOrDefaultAsync(t => t.Slug == "divine-jewels") is null && legacyJewels is null)
            db.Tenants.Add(TenantDefs.DivineJewels());

        if (await db.Tenants.FirstOrDefaultAsync(t => t.Slug == "sanathanam") is null && legacySanathanam is null)
            db.Tenants.Add(TenantDefs.Sanathanam());

        await db.SaveChangesAsync();
    }

    /// Ensures each site has its own categories + products (idempotent for existing DBs).
    public static async Task EnsurePerSiteCatalogAsync(AppDbContext db)
    {
        var tenants = await db.Tenants.ToListAsync();
        foreach (var tenant in tenants)
        {
            var (cats, subMap, products) = tenant.Slug switch
            {
                "divine-jewels" => (CatalogDefs.JewelsCategories, CatalogDefs.JewelsSubcategories, CatalogDefs.JewelsProducts()),
                "sanathanam" => (CatalogDefs.SanathanamCategories, CatalogDefs.SanathanamSubcategories, CatalogDefs.SanathanamProducts()),
                _ => (CatalogDefs.PetalsCategories, CatalogDefs.PetalsSubcategories, CatalogDefs.PetalsProducts()),
            };

            foreach (var name in cats)
            {
                if (!await db.Categories.AnyAsync(c => c.TenantId == tenant.Id && c.Name == name))
                    db.Categories.Add(new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = name });
            }

            SeedSubcategories(db, tenant, subMap);

            var hasProducts = await db.ProductTenants.AnyAsync(pt => pt.TenantId == tenant.Id);
            if (!hasProducts)
            {
                foreach (var product in products)
                {
                    db.Products.Add(product);
                    db.ProductTenants.Add(new ProductTenant { ProductId = product.Id, TenantId = tenant.Id });
                }
            }
            else
            {
                // Backfill empty subcategory from seed catalog when product names match.
                var byName = products.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
                var existing = await db.Products
                    .Where(p => p.ProductTenants.Any(pt => pt.TenantId == tenant.Id))
                    .ToListAsync();
                foreach (var product in existing)
                {
                    if (!string.IsNullOrWhiteSpace(product.Subcategory)) continue;
                    if (byName.TryGetValue(product.Name, out var seed))
                        product.Subcategory = seed.Subcategory;
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private static void SeedCatalogForTenant(
        AppDbContext db,
        Tenant tenant,
        string[] categories,
        Dictionary<string, string[]> subMap,
        List<Product> products)
    {
        foreach (var name in categories)
            db.Categories.Add(new Category { Id = Guid.NewGuid(), TenantId = tenant.Id, Name = name });

        SeedSubcategories(db, tenant, subMap);

        foreach (var product in products)
        {
            db.Products.Add(product);
            db.ProductTenants.Add(new ProductTenant { ProductId = product.Id, TenantId = tenant.Id });
        }
    }

    private static void SeedSubcategories(AppDbContext db, Tenant tenant, Dictionary<string, string[]> subMap)
    {
        foreach (var (categoryName, subs) in subMap)
        {
            foreach (var sub in subs)
            {
                var exists = db.Subcategories.Local.Any(s =>
                                 s.TenantId == tenant.Id && s.CategoryName == categoryName && s.Name == sub)
                             || db.Subcategories.Any(s =>
                                 s.TenantId == tenant.Id && s.CategoryName == categoryName && s.Name == sub);
                if (!exists)
                {
                    db.Subcategories.Add(new Subcategory
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenant.Id,
                        CategoryName = categoryName,
                        Name = sub
                    });
                }
            }
        }
    }

    private static void ApplyDef(Tenant t, Tenant def)
    {
        t.Name = def.Name;
        t.Tagline = def.Tagline;
        t.Domain = def.Domain;
        t.ThemeKey = def.ThemeKey;
        t.HeroEyebrow = def.HeroEyebrow;
        t.HeroTitle = def.HeroTitle;
        t.HeroHighlight = def.HeroHighlight;
        t.HeroBody = def.HeroBody;
        t.StoryTitle = def.StoryTitle;
        t.StoryBody = def.StoryBody;
        t.LogoUrl = def.LogoUrl;
        t.HeroVideoUrl = def.HeroVideoUrl;
        t.OrderPrefix = def.OrderPrefix;
    }
}

internal static class TenantDefs
{
    public static Tenant DivinePetals() => New(
        "divine-petals", "Divine Petals", "Purity Enhanced",
        "localhost:5173", "divine-petals",
        "Soaps · Shampoos · Perfumes",
        "Naturals That Tell", "India's Story",
        "Handcrafted soaps, botanical shampoos & natural perfumes — processed with Ayurvedic herbs and ancient Indian formulations. Pure goodness starting from ₹140.",
        "Born from India's Ancient Wisdom",
        "Divine Petals was born in a small Bangalore kitchen, where our founder began blending cold-pressed oils and medicinal herbs. Every bar is still made by hand — no machines, no shortcuts, no compromise.",
        "/assets/soaps/divinepetals.jpeg",
        "https://socllleyedkzivnimxru.supabase.co/storage/v1/object/public/divinepetalsassessts/WhatsApp%20Video%202026-04-03%20at%2017.48.52.mp4",
        "DP");

    public static Tenant DivineJewels() => New(
        "divine-jewels", "Divine Jewels", "Crafted to shine",
        "localhost:5174", "divine-jewels",
        "Gold · Silver · Gemstones",
        "Jewellery that carries", "your light",
        "Hand-finished necklaces, earrings, and rings — temple-inspired motifs and modern minimal lines. Each piece is polished by artisans in Karnataka.",
        "Every stone, a story",
        "Divine Jewels curates fine jewellery for weddings, festivals, and everyday grace. From delicate daily wear to statement bridal sets — purity of metal, honesty in craft.",
        "https://placehold.co/128x128/1f1520/c9a227?text=DJ",
        "",
        "DJ");

    public static Tenant Sanathanam() => New(
        "sanathanam", "Sanathanam", "Tradition in every weave",
        "localhost:5175", "sanathanam",
        "Textiles · Dry fruits · Spices",
        "Weaves, fabrics &", "farm-fresh bounty",
        "Handloom sarees, soft cottons, and premium dry fruits from Indian farms — almonds, cashews, dates, and saffron-kissed treats for your home.",
        "From loom to larder",
        "Sanathanam brings together India's textile heritage and the richness of dry fruits. Shop breathable fabrics for every season and pantry staples packed with care.",
        "https://placehold.co/128x128/7c2d12/fef3c7?text=S",
        "",
        "SN");

    private static Tenant New(
        string slug, string name, string tagline, string domain, string theme,
        string eyebrow, string title, string highlight, string body,
        string storyTitle, string storyBody, string logo, string video, string prefix) => new()
    {
        Id = Guid.NewGuid(),
        Slug = slug,
        Name = name,
        Tagline = tagline,
        Domain = domain,
        ThemeKey = theme,
        HeroEyebrow = eyebrow,
        HeroTitle = title,
        HeroHighlight = highlight,
        HeroBody = body,
        StoryTitle = storyTitle,
        StoryBody = storyBody,
        LogoUrl = logo,
        HeroVideoUrl = video,
        OrderPrefix = prefix
    };
}

internal static class CatalogDefs
{
    public static readonly string[] PetalsCategories = ["Herbal", "Floral", "Charcoal", "Everyday", "Luxury"];
    public static readonly string[] JewelsCategories = ["Necklaces", "Earrings", "Rings", "Bridal", "Silver"];
    public static readonly string[] SanathanamCategories = ["Sarees", "Fabrics", "Dry Fruits", "Spices", "Gifting"];

    public static readonly Dictionary<string, string[]> PetalsSubcategories = new()
    {
        ["Herbal"] = ["Face bars", "Body bars"],
        ["Floral"] = ["Face bars", "Body bars"],
        ["Charcoal"] = ["Face bars", "Body bars"],
        ["Everyday"] = ["Face bars", "Body bars"],
        ["Luxury"] = ["Face bars", "Gift sets"],
    };

    public static readonly Dictionary<string, string[]> JewelsSubcategories = new()
    {
        ["Necklaces"] = ["Temple", "Contemporary"],
        ["Earrings"] = ["Drops", "Hoops"],
        ["Rings"] = ["Solitaire", "Stackable"],
        ["Bridal"] = ["Sets", "Chokers"],
        ["Silver"] = ["Oxidised", "Plain"],
    };

    public static readonly Dictionary<string, string[]> SanathanamSubcategories = new()
    {
        ["Sarees"] = ["Silk", "Cotton"],
        ["Fabrics"] = ["Print", "Khadi"],
        ["Dry Fruits"] = ["Nuts", "Dates"],
        ["Spices"] = ["Premium"],
        ["Gifting"] = ["Boxes"],
    };

    public static List<Product> PetalsProducts() => new()
    {
        P("Sandalwood & Turmeric", 249, "Herbal", "Face bars", "Handcrafted with pure Mysore sandalwood and haldi for a radiant, even-toned complexion.", ["Mysore Sandalwood Powder", "Turmeric (Haldi)", "Coconut Oil", "Shea Butter", "Vitamin E"], true, "/assets/soaps/sandalwood.jpg"),
        P("Rose & Saffron", 289, "Floral", "Face bars", "Luxurious blend of Kannauj rose water and pure Kashmiri saffron for glowing skin.", ["Kannauj Rose Water", "Kashmiri Saffron", "Almond Oil", "Glycerin", "Kokum Butter"], true, "/assets/soaps/rose-saffron.jpg"),
        P("Neem & Tulsi", 199, "Herbal", "Body bars", "Ancient Ayurvedic recipe with neem leaves and holy basil to fight acne and impurities.", ["Neem Leaf Extract", "Tulsi (Holy Basil)", "Tea Tree Oil", "Castor Oil", "Neem Oil"], true, "/assets/soaps/neem-tulsi.jpg"),
        P("Activated Charcoal & Mint", 229, "Charcoal", "Face bars", "Deep cleansing activated charcoal with cooling spearmint for detoxified, fresh skin.", ["Activated Charcoal", "Spearmint Essential Oil", "Coconut Oil", "Kaolin Clay", "Peppermint Extract"], false, "/assets/soaps/charcoal-mint.jpg"),
        P("Coconut & Jasmine", 219, "Floral", "Body bars", "Cold-pressed virgin coconut oil and mogra jasmine for intense moisture and fragrance.", ["Virgin Coconut Oil", "Mogra Jasmine Extract", "Rice Bran Oil", "Glycerin", "Jasmine Essential Oil"], true, "/assets/soaps/coconut-jasmine.jpg"),
        P("Coffee & Cardamom", 259, "Everyday", "Body bars", "Exfoliating Coorg coffee grounds with aromatic elaichi for energized mornings.", ["Coorg Coffee Grounds", "Cardamom (Elaichi)", "Sunflower Oil", "Cocoa Butter", "Coffee Essential Oil"], false, "/assets/soaps/coffee-cardamom.jpg"),
        P("Aloe & Cucumber", 189, "Everyday", "Face bars", "Soothing aloe vera gel with cucumber extract — perfect for sensitive and irritated skin.", ["Aloe Vera Gel", "Cucumber Extract", "Jojoba Oil", "Glycerin", "Chamomile Extract"], false, "/assets/soaps/aloe-cucumber.jpg"),
        P("Kumkumadi Glow", 349, "Luxury", "Face bars", "Inspired by the legendary kumkumadi tailam with 16 rare herbs and pure saffron strands.", ["Kashmiri Saffron", "Sesame Oil", "Manjistha", "Lodhra", "Vetiver (Khus)", "Lotus Extract"], true, "/assets/soaps/kumkumadi.jpg"),
        P("Himalayan Pink Salt", 279, "Luxury", "Gift sets", "Mineral-rich pink salt from the Himalayas blended with argan oil for silky smooth skin.", ["Himalayan Pink Salt", "Argan Oil", "Shea Butter", "Lavender Essential Oil", "Vitamin E"], false, "/assets/soaps/himalayan-salt.jpg"),
        P("Multani Mitti", 179, "Everyday", "Face bars", "India's time-tested Fuller's Earth bar for oil control and natural skin brightening.", ["Fuller's Earth (Multani Mitti)", "Rose Water", "Neem Oil", "Lemon Extract", "Glycerin"], false, "/assets/soaps/multani-mitti.jpg"),
    };

    public static List<Product> JewelsProducts() => new()
    {
        P("Temple Lakshmi Necklace", 12499, "Necklaces", "Temple", "Gold-plated temple necklace with Lakshmi motif — bridal and festive wear.", ["Gold plated", "Temple work", "Adjustable"], true, "https://placehold.co/400x300/1f1520/c9a227?text=Necklace"),
        P("Pearl Drop Earrings", 2499, "Earrings", "Drops", "Classic pearl drops on sterling silver hooks for everyday elegance.", ["925 silver", "Freshwater pearl"], true, "https://placehold.co/400x300/1f1520/c9a227?text=Earrings"),
        P("Solitaire Stack Ring", 4599, "Rings", "Solitaire", "Minimal CZ solitaire in a thin gold band — stackable daily ring.", ["Gold plated", "CZ"], true, "https://placehold.co/400x300/1f1520/c9a227?text=Ring"),
        P("Bridal Choker Set", 18999, "Bridal", "Sets", "Full bridal choker with matching earrings and maang tikka.", ["Gold plated", "Kundan", "Set of 3"], true, "https://placehold.co/400x300/1f1520/c9a227?text=Bridal"),
        P("Oxidised Silver Jhumkas", 1899, "Silver", "Oxidised", "Handcrafted oxidised jhumkas with ghungroo detail.", ["Oxidised silver", "Handmade"], false, "https://placehold.co/400x300/1f1520/c9a227?text=Silver"),
        P("Layered Chain Necklace", 3299, "Necklaces", "Contemporary", "Three-layer delicate chain in warm gold tone.", ["Gold plated", "Layered"], false, "https://placehold.co/400x300/1f1520/c9a227?text=Chain"),
        P("Hoop Earrings Medium", 1599, "Earrings", "Hoops", "Lightweight medium hoops with subtle hammered texture.", ["Gold plated"], false, "https://placehold.co/400x300/1f1520/c9a227?text=Hoops"),
        P("Toe Ring Pair", 899, "Silver", "Plain", "Traditional silver toe rings with floral engraving.", ["925 silver"], false, "https://placehold.co/400x300/1f1520/c9a227?text=Toe+Ring"),
    };

    public static List<Product> SanathanamProducts() => new()
    {
        P("Kanjivaram Silk Saree", 8999, "Sarees", "Silk", "Pure silk Kanjivaram with contrast border — wedding and festive wear.", ["Silk", "Zari border"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Saree"),
        P("Cotton Handloom Saree", 2499, "Sarees", "Cotton", "Breathable handloom cotton for daily elegance.", ["Cotton", "Handloom"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Cotton+Saree"),
        P("Block Print Fabric 2.5m", 899, "Fabrics", "Print", "Jaipur block-print cotton — ready for kurtas and home textiles.", ["Cotton", "Block print"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Fabric"),
        P("Premium Almonds 500g", 649, "Dry Fruits", "Nuts", "California-grade almonds, vacuum packed for freshness.", ["Almonds", "500g"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Almonds"),
        P("Cashew Whole 500g", 799, "Dry Fruits", "Nuts", "W240 whole cashews — lightly roasted option available.", ["Cashews", "500g"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Cashews"),
        P("Medjool Dates 400g", 549, "Dry Fruits", "Dates", "Soft Medjool dates — natural sweetness for snacking.", ["Dates", "400g"], false, "https://placehold.co/400x300/7c2d12/fef3c7?text=Dates"),
        P("Kashmiri Saffron 1g", 899, "Spices", "Premium", "Mongra saffron strands from Kashmir.", ["Saffron", "1g"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Saffron"),
        P("Festival Dry Fruit Box", 1499, "Gifting", "Boxes", "Assorted almonds, cashews, raisins & pistachios in a gift box.", ["Gift box", "Assorted"], true, "https://placehold.co/400x300/7c2d12/fef3c7?text=Gift+Box"),
        P("Khadi Cotton Stole", 699, "Fabrics", "Khadi", "Lightweight khadi stole with hand-finished edges.", ["Khadi", "Cotton"], false, "https://placehold.co/400x300/7c2d12/fef3c7?text=Stole"),
    };

    private static Product P(string name, decimal price, string category, string subcategory, string desc, string[] ingredients, bool bestseller, string image) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        PriceInInr = price,
        Category = category,
        Subcategory = subcategory,
        Description = desc,
        Ingredients = ingredients,
        Bestseller = bestseller,
        Available = true,
        ImageUrl = image
    };
}
