const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'pixelforge.db');
const db = new sqlite3.Database(dbPath);

// Helper wrapper for async sqlite queries
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDatabase() {
  await runAsync(`PRAGMA foreign_keys = ON`);

  // 1. Users table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Games table (Unique title and slug)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      genre TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Released',
      description TEXT NOT NULL,
      tagline TEXT,
      release_date TEXT,
      rating REAL DEFAULT 4.8,
      platforms TEXT,
      trailer_url TEXT,
      banner_img TEXT,
      screenshots TEXT,
      featured INTEGER DEFAULT 0,
      tags TEXT,
      play_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Team members table (Unique name, real social links structure, verified dev flag)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      bio TEXT NOT NULL,
      avatar TEXT,
      social_links TEXT DEFAULT '[]',
      is_verified INTEGER DEFAULT 0,
      order_idx INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await runAsync(`ALTER TABLE team_members ADD COLUMN is_verified INTEGER DEFAULT 0`); } catch (_) {}

  // 4. Jobs / Careers table (Unique title)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Full-Time',
      experience TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      perks TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Contact Messages table (with is_sample flag for optional demo data)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      is_sample INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await runAsync(`ALTER TABLE messages ADD COLUMN is_sample INTEGER DEFAULT 0`); } catch (_) {}

  // 6. Job Applications table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      job_title TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      email TEXT NOT NULL,
      portfolio_url TEXT,
      resume_path TEXT,
      cover_note TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Devlogs table (Real updates, articles, and patch notes linked to games)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS devlogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      game_id INTEGER,
      version TEXT,
      author TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
    )
  `);

  // 8. Analytics Events table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      page_url TEXT NOT NULL,
      referrer TEXT,
      device_type TEXT,
      browser TEXT,
      screen_res TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      is_simulated INTEGER DEFAULT 0,
      is_forced INTEGER DEFAULT 0
    )
  `);
  try { await runAsync(`ALTER TABLE events ADD COLUMN is_simulated INTEGER DEFAULT 0`); } catch (_) {}
  try { await runAsync(`ALTER TABLE events ADD COLUMN is_forced INTEGER DEFAULT 0`); } catch (_) {}

  // Indexes for analytics
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)`);

  // 9. Visitor Profiles table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS visitor_profiles (
      visitor_id TEXT PRIMARY KEY,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_visits INTEGER DEFAULT 1,
      total_page_views INTEGER DEFAULT 0,
      pages_visited TEXT DEFAULT '[]',
      device_type TEXT DEFAULT 'desktop',
      browser TEXT DEFAULT 'Chrome',
      os TEXT DEFAULT 'Unknown',
      first_referrer TEXT DEFAULT 'Direct',
      assigned_variants TEXT DEFAULT '{}',
      goals_completed TEXT DEFAULT '[]',
      status TEXT DEFAULT 'new',
      soft_fingerprint TEXT,
      last_session_id TEXT,
      is_simulated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await runAsync(`ALTER TABLE visitor_profiles ADD COLUMN last_session_id TEXT`); } catch (_) {}

  // 10. Pilot Pass Profiles (Returning visitor identity claim & restoration)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS pilot_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      callsign TEXT UNIQUE NOT NULL,
      email TEXT,
      canonical_visitor_id TEXT NOT NULL,
      recovery_code_hash TEXT NOT NULL,
      magic_token_hash TEXT,
      magic_token_expires DATETIME,
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      preferences TEXT DEFAULT '{}',
      wishlist TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 11. Pilot Devices table (Linked hardware/browsers per pilot)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS pilot_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pilot_id INTEGER NOT NULL,
      visitor_id TEXT NOT NULL,
      device_info TEXT,
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pilot_id) REFERENCES pilot_profiles(id) ON DELETE CASCADE,
      UNIQUE(pilot_id, visitor_id)
    )
  `);

  // 12. Experiments table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exp_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      goal_event TEXT NOT NULL,
      target_page TEXT DEFAULT '/',
      status TEXT DEFAULT 'active',
      variant_a_label TEXT DEFAULT 'Original',
      variant_a_config TEXT NOT NULL,
      variant_b_label TEXT DEFAULT 'Variant B',
      variant_b_config TEXT NOT NULL,
      winner_variant TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 13. Experiment Assignments & Conversions
  await runAsync(`
    CREATE TABLE IF NOT EXISTS experiment_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      experiment_id INTEGER NOT NULL,
      variant TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_forced INTEGER DEFAULT 0,
      is_simulated INTEGER DEFAULT 0,
      UNIQUE(visitor_id, experiment_id)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS experiment_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      experiment_id INTEGER NOT NULL,
      variant TEXT NOT NULL,
      goal_event TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_forced INTEGER DEFAULT 0,
      is_simulated INTEGER DEFAULT 0
    )
  `);

  // Seed initial data (idempotent, clean, NO fake messages, NO fake social links)
  await seedInitialData();
}

async function seedInitialData() {
  // Check users - No real person photos in avatars
  const userCount = await getAsync(`SELECT COUNT(*) as count FROM users`);
  if (userCount.count === 0) {
    console.log('Seeding initial admin & editor users (initials avatar, no stock photos)...');
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const editorPass = bcrypt.hashSync('editor123', salt);

    await runAsync(
      `INSERT OR IGNORE INTO users (name, email, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?)`,
      ['CyberAdmin', 'admin@pixelforge.io', adminPass, 'admin', '']
    );

    await runAsync(
      `INSERT OR IGNORE INTO users (name, email, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?)`,
      ['NeonEditor', 'editor@pixelforge.io', editorPass, 'editor', '']
    );
  }

  // Check games
  const gameCount = await getAsync(`SELECT COUNT(*) as count FROM games`);
  if (gameCount.count === 0) {
    console.log('Seeding default games portfolio...');
    const games = [
      {
        title: 'CyberVanguard 2099',
        slug: 'cybervanguard-2099',
        genre: 'Action RPG / Cyberpunk',
        status: 'Released',
        tagline: 'Defy the megacorps in a neon-drenched synthwave dystopia.',
        description: 'CyberVanguard 2099 merges precision combat with intense hack-and-slash mechanics across sprawling neon megastructures. Upgrade cyberware, customize tactical neural-links, and lead the neon rebellion against autonomous drone armies.',
        release_date: 'November 2025',
        rating: 4.9,
        platforms: JSON.stringify(['Steam', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch 2']),
        trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        banner_img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
        screenshots: JSON.stringify([
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80'
        ]),
        featured: 1,
        tags: JSON.stringify(['Cyberpunk', 'Action RPG', 'Singleplayer', 'Synthwave', 'Melee']),
        play_url: 'https://store.steampowered.com'
      },
      {
        title: 'Chrono Rift: Echoes',
        slug: 'chrono-rift-echoes',
        genre: 'Sci-Fi Metroidvania',
        status: 'Released',
        tagline: 'Manipulate fractured timelines to escape an interdimensional labyrinth.',
        description: 'A mind-bending 2.5D puzzle platformer where you record timeline ghosts of yourself to solve spatial enigmas, fight paradox bosses, and repair a decaying multiverse.',
        release_date: 'March 2025',
        rating: 4.7,
        platforms: JSON.stringify(['Steam', 'Nintendo Switch 2', 'PlayStation 5']),
        trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        banner_img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
        screenshots: JSON.stringify([
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
        ]),
        featured: 1,
        tags: JSON.stringify(['Time Travel', 'Metroidvania', 'Pixel Art', 'Puzzle Platformer']),
        play_url: 'https://store.steampowered.com'
      },
      {
        title: 'Pixel Siege: Retribution',
        slug: 'pixel-siege-retribution',
        genre: 'Tactical Roguelite Shooter',
        status: 'In Development',
        tagline: 'Assemble your mech platoon and defend neon bastions against cosmic swarms.',
        description: 'Real-time tactical tower defense hybridized with rogue-lite mech action. Build automated plasma turrets while directly piloting a heavily armed vanguard unit.',
        release_date: 'Q3 2026',
        rating: 4.8,
        platforms: JSON.stringify(['Steam', 'Xbox Series X']),
        trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        banner_img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
        screenshots: JSON.stringify([
          'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80'
        ]),
        featured: 1,
        tags: JSON.stringify(['Roguelite', 'Tower Defense', 'Mecha', 'Tactical', 'Early Access']),
        play_url: 'https://store.steampowered.com'
      },
      {
        title: 'Abyssal Drifter',
        slug: 'abyssal-drifter',
        genre: 'Cosmic Horror Roguelike',
        status: 'Concept Phase',
        tagline: 'Descend into bioluminescent ocean rifts filled with Eldritch entities.',
        description: 'Atmospheric deep-sea survival horror with procedural trenches, sound-based navigation mechanics, and modular submersible modifications.',
        release_date: '2027',
        rating: 4.6,
        platforms: JSON.stringify(['Steam']),
        trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        banner_img: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1200&auto=format&fit=crop&q=80',
        screenshots: JSON.stringify([
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'
        ]),
        featured: 0,
        tags: JSON.stringify(['Horror', 'Underwater', 'Survival', 'Atmospheric']),
        play_url: 'https://store.steampowered.com'
      }
    ];

    for (const g of games) {
      await runAsync(
        `INSERT OR IGNORE INTO games (title, slug, genre, status, description, tagline, release_date, rating, platforms, trailer_url, banner_img, screenshots, featured, tags, play_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.title, g.slug, g.genre, g.status, g.description, g.tagline, g.release_date, g.rating, g.platforms, g.trailer_url, g.banner_img, g.screenshots, g.featured, g.tags, g.play_url]
      );
    }
  }

  // Check Team Members — NO fake social links seeded (empty array so no icon shows by default)
  const memberCount = await getAsync(`SELECT COUNT(*) as count FROM team_members`);
  if (memberCount.count === 0) {
    console.log('Seeding studio team members (clean initials, NO fake social links)...');
    const members = [
      {
        name: 'Elena "Voxel" Chen',
        role: 'Founder & Game Director',
        department: 'Leadership',
        bio: 'Former AAA lead designer with 14 years creating cult-favorite action titles. Passionate about tactile game feel and synthwave worldbuilding.',
        avatar: '',
        social_links: '[]',
        is_verified: 1,
        order_idx: 1
      },
      {
        name: 'Marcus Vance',
        role: 'Technical Lead & Engine Architect',
        department: 'Engineering',
        bio: 'C++ graphics wizard specializing in low-latency custom rendering pipelines, deterministic physics, and seamless multiplayer netcode.',
        avatar: '',
        social_links: '[]',
        is_verified: 1,
        order_idx: 2
      },
      {
        name: 'Sora Takahashi',
        role: 'Principal Art Director & Concept Artist',
        department: 'Art & Animation',
        bio: 'Pioneer of the "Neo-Chroma" pixel aesthetic. Infusing retro hand-drawn sprites with modern volumetric lighting.',
        avatar: '',
        social_links: '[]',
        is_verified: 0,
        order_idx: 3
      },
      {
        name: 'Kai Robertson',
        role: 'Lead Audio Designer & Composer',
        department: 'Audio',
        bio: 'Modular synthesizer enthusiast, analog drum machine collector, and award-winning composer for pulse-pounding game soundtracks.',
        avatar: '',
        social_links: '[]',
        is_verified: 0,
        order_idx: 4
      },
      {
        name: 'Maya Lin',
        role: 'Lead Level & Narrative Designer',
        department: 'Design',
        bio: 'Crafting non-linear branching lore, environmental storytelling, and razor-sharp boss encounters.',
        avatar: '',
        social_links: '[]',
        is_verified: 0,
        order_idx: 5
      },
      {
        name: 'Darius Thorne',
        role: 'Senior VFX & Shader Engineer',
        department: 'Engineering',
        bio: 'Obsessed with fluid dynamics, particle bursts, screen-shake mathematics, and crunchy tactile hit-stop animations.',
        avatar: '',
        social_links: '[]',
        is_verified: 0,
        order_idx: 6
      }
    ];

    for (const m of members) {
      await runAsync(
        `INSERT OR IGNORE INTO team_members (name, role, department, bio, avatar, social_links, is_verified, order_idx) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.name, m.role, m.department, m.bio, m.avatar, m.social_links, m.is_verified, m.order_idx]
      );
    }
  }

  // Ensure any pre-existing seeded members have fake social links cleared to empty list
  await runAsync(`UPDATE team_members SET social_links = '[]' WHERE social_links LIKE '%twitter.com%' OR social_links LIKE '%github.com%'`);

  // Check Jobs
  const jobCount = await getAsync(`SELECT COUNT(*) as count FROM jobs`);
  if (jobCount.count === 0) {
    console.log('Seeding job openings...');
    const jobs = [
      {
        title: 'Senior Gameplay Programmer',
        department: 'Engineering',
        location: 'Remote (Worldwide) or Tokyo Studio',
        type: 'Full-Time',
        experience: '5+ years experience in C++ / Unreal or Unity',
        description: 'We are seeking an experienced Gameplay Programmer to craft responsive character controllers, snappy combat mechanics, and visceral enemy AI for our upcoming flagship title.',
        requirements: JSON.stringify([
          '5+ years professional game development experience in C++ or C#',
          'Shipped at least one commercial PC/Console title',
          'Strong understanding of 3D math, physics integration, and animation state trees',
          'Passion for action/roguelike game feel and camera systems'
        ]),
        perks: JSON.stringify([
          'Competitive salary + studio profit share bonus',
          '100% remote flexibility with home office stipend',
          'Generous health, dental, and wellness coverage',
          'Unlimited gaming budget for research & Steam credits'
        ]),
        is_active: 1
      },
      {
        title: '3D Character & Hard-Surface Artist',
        department: 'Art & Animation',
        location: 'San Francisco, CA / Hybrid',
        type: 'Full-Time',
        experience: '3+ years experience',
        description: 'Bring our mecha combatants and cybernetic warriors to life! You will sculpt high-poly models, author PBR textures, and optimize low-poly assets with stunning silhouette clarity.',
        requirements: JSON.stringify([
          'Proficiency in Blender/Maya, ZBrush, and Substance Painter',
          'Strong eye for anatomy, mech mechanical articulation, and hard-surface detailing',
          'Portfolio showing both stylized and realistic asset creation'
        ]),
        perks: JSON.stringify([
          'State-of-the-art workstation (RTX 4090 + Cintiq Pro)',
          'Annual conference travel & workshop budget',
          'Flexible working hours'
        ]),
        is_active: 1
      },
      {
        title: 'Technical Narrative Writer',
        department: 'Design & Narrative',
        location: 'Remote (Americas / Europe)',
        type: 'Contract / Full-Time',
        experience: '3+ years in interactive fiction or game dialogue',
        description: 'Write gripping dialogue, terminal logs, world lore, and branching quest scripts for our next cyberpunk epic.',
        requirements: JSON.stringify([
          'Superb world-building and character voice dialogue skills',
          'Experience working with Twine, Ink, or node-based dialogue editors',
          'Ability to iterate quickly based on gameplay feedback'
        ]),
        perks: JSON.stringify([
          'Remote-first culture',
          'Paid creative sabbaticals',
          'Comprehensive health benefits'
        ]),
        is_active: 1
      }
    ];

    for (const j of jobs) {
      await runAsync(
        `INSERT OR IGNORE INTO jobs (title, department, location, type, experience, description, requirements, perks, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [j.title, j.department, j.location, j.type, j.experience, j.description, j.requirements, j.perks, j.is_active]
      );
    }
  }

  // NOTE: Contact messages are NEVER seeded by default!
  // Clear any old fake messages that were previously seeded
  await runAsync(`DELETE FROM messages WHERE email LIKE '%publishergames.com%' OR email LIKE '%indiegameawards.org%'`);

  // Seed sample applications if empty
  const appCount = await getAsync(`SELECT COUNT(*) as count FROM applications`);
  if (appCount.count === 0) {
    await runAsync(`
      INSERT INTO applications (job_id, job_title, applicant_name, email, portfolio_url, cover_note, status) VALUES
      (1, 'Senior Gameplay Programmer', 'David Kowalski', 'david.k@gamedev.me', 'https://davidkowalski.dev', 'I have built responsive melee combat engines for 6 years and am a huge admirer of Pixel Forge’s design philosophy.', 'interviewing'),
      (2, '3D Character & Hard-Surface Artist', 'Lyra Vance', 'lyra.art@portfolio.io', 'https://artstation.com/lyravance', 'Here is my latest mech design showcase reel. Looking forward to connecting!', 'pending')
    `);
  }

  // Check Devlogs
  const devlogCount = await getAsync(`SELECT COUNT(*) as count FROM devlogs`);
  if (devlogCount.count === 0) {
    console.log('Seeding initial devlogs & studio updates...');
    const devlogs = [
      {
        title: 'Deterministic Rollback Netcode in CyberVanguard 2099',
        slug: 'deterministic-rollback-netcode-cybervanguard',
        category: 'ENGINEERING',
        excerpt: 'How we rebuilt our UDP socket networking stack from ground zero to achieve 1-frame input latency across intercontinental lobbies.',
        content: `# Deterministic Rollback Netcode in CyberVanguard 2099

When developing a lightning-fast cyberpunk arena battler, 60 FPS input predictability is not an optional polish item—it is the baseline contract with our players.

## The Problem with Lockstep

In traditional lockstep network architecture, every participant waits for all remote clients to acknowledge inputs before simulating the next frame. Over 80ms pings, this introduces sluggish control latency that ruins split-second parries and dodge mechanics.

\`\`\`cpp
// Core tick simulation contract
struct InputPacket {
  uint32_t frame_index;
  uint16_t buttons_bitmask;
  int16_t  aim_axis_x;
  int16_t  aim_axis_y;
};
\`\`\`

## Moving to GGPO-Inspired Rollback

Our custom C++ engine now simulates local frames optimistically without waiting. When remote inputs arrive out of order, the engine snaps backwards up to 7 frames, reapplies state mutations, and fast-forwards in under 1.2ms.

> "If a player hits parry on frame 44, their blade must ignite on frame 44—regardless of whether their opponent is in Berlin, Tokyo, or San Francisco."

### Key Optimizations

- **State Compression:** Total game state compressed down to 4.2 KB per tick.
- **Ring Buffer Snapshots:** Rolling memory cache of 120 historical frames.
- **Predictive AI Heuristics:** When packets drop, enemy neural weights project likely momentum vectors.

Look out for public matchmaking stress-tests during our next open beta session!`,
        cover_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        game_id: 1,
        version: 'v0.9.4',
        author: 'Marcus Vance',
        status: 'published',
        published_at: '2026-09-15 14:00:00'
      },
      {
        title: 'Neon Ronin: Echoes — Patch 1.2 Combat Overhaul & New Katana Arts',
        slug: 'neon-ronin-patch-1-2-combat-overhaul',
        category: 'PATCH NOTES',
        excerpt: 'Version 1.2 brings complete hit-stop rebalancing, 4 new ancestral weapon stances, and native Steam Deck 90Hz OLED optimization.',
        content: `# Neon Ronin: Echoes — Major Update 1.2

Today we are deploying **Update 1.2** across all platforms! This patch directly addresses player combat feedback from the community discord and introduces our much-anticipated Katana Mastery stances.

## Highlights & Combat Rebalancing

- **Tactical Deflection Window:** Window expanded by 3 frames (now 7 frames total) on Master difficulty.
- **Execution Hit-Stop:** Added 4 frames of juicy screen freeze on critical decapitations.
- **4 New Weapon Arts:**
  - *Chroma Flash:* Dash forward leaving an after-image slash clone.
  - *Void Reversal:* Absorb incoming laser beams and reflect back 250% energy.
  - *Dragon Fang:* Airborne downward plunge dealing area shockwaves.
  - *Ghost Step:* Vanish in smoke to break enemy sniper lock-ons.

\`\`\`text
[PATCH 1.2.0 CHANGELOG]
- Fixed camera clipping in Shinjuku Sector 4 narrow alleyways.
- Reduced memory overhead for particle emitters by 34%.
- Added HDR color grading support for OLED monitors.
- Full Steam Cloud save synchronization.
\`\`\`

Enjoy the new stances, Ronin! As always, share your boss fight clips with us on our community channels.`,
        cover_image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
        game_id: 2,
        version: 'v1.2.0',
        author: 'Elena Rostova',
        status: 'published',
        published_at: '2026-09-28 10:30:00'
      },
      {
        title: 'Crafting Volumetric Fog Shaders on 16-Bit Grids',
        slug: 'volumetric-fog-shaders-16bit-grids',
        category: 'ART & DESIGN',
        excerpt: 'Exploring the mathematics of retro pixel dithering mixed with modern raymarching smoke shaders in custom HLSL.',
        content: `# Crafting Volumetric Fog Shaders on 16-Bit Grids

How do you combine the tactile nostalgia of chunky 1990s sprite art with the atmospheric depth of a modern AAA cyberpunk cityscape? That was the core technical question when establishing the visual identity of **Pixel Forge**.

## The Raymarching Technique

Instead of relying on basic alpha billboards that look flat when navigating 2.5D camera angles, we render low-resolution volume textures:

1. Raymarch 16 depth samples per pixel inside the camera view frustum.
2. Sample 3D Worley noise to simulate atmospheric humidity and exhaust smog.
3. Quantize lighting values into 8-color stepped gradients.
4. Apply an ordered Bayer 8x8 dither matrix to preserve pixel crunchiness.

\`\`\`hlsl
// Dither quantization step
float Dither8x8(int2 pixelCoord) {
  const int ditherTable[64] = {
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  };
  return float(ditherTable[(pixelCoord.y % 8) * 8 + (pixelCoord.x % 8)]) / 64.0;
}
\`\`\`

The result is a dreamlike neon haze that feels right at home on both CRT televisions and 4K displays.`,
        cover_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        game_id: 1,
        version: '',
        author: 'Sora Takahashi',
        status: 'published',
        published_at: '2026-10-02 18:00:00'
      },
      {
        title: 'Analog Modular Synthesis for Retro Grid Racer DX',
        slug: 'analog-modular-synthesis-retro-grid-racer',
        category: 'SOUND & MUSIC',
        excerpt: 'A behind-the-scenes breakdown of Eurorack patch cables, Moog ladders, and 140 BPM synthwave kick drums recorded to tape.',
        content: `# Analog Modular Synthesis for Retro Grid Racer DX

For Retro Grid Racer DX, digital MIDI soundfonts simply lacked the growl and grit required for 300 MPH neon speedways. Every bassline on this soundtrack was patched by hand on vintage hardware and mastered to 1/4-inch reel-to-reel tape.

## The Signal Chain

- **Lead Bass:** Dual analog VCOs running saw and square waves through a 24dB ladder filter.
- **Percussion:** Roland TR-808 kick through gentle Germanium diode clipping.
- **Atmosphere:** Roland Juno-106 chorus layered with stereo bucket-brigade analog delay.

> "When your car hits 300 KPH on nitro boost, the soundtrack dynamically opens the low-pass filter cutoff in sync with engine RPM."

We will be launching the official OST vinyl release alongside our upcoming physical collector editions. Stay tuned for track preview snippets!`,
        cover_image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        game_id: 4,
        version: '',
        author: 'Kai Robertson',
        status: 'published',
        published_at: '2026-10-05 12:15:00'
      }
    ];

    for (const d of devlogs) {
      await runAsync(
        `INSERT OR IGNORE INTO devlogs (title, slug, category, excerpt, content, cover_image, game_id, version, author, status, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.title, d.slug, d.category, d.excerpt, d.content, d.cover_image, d.game_id, d.version, d.author, d.status, d.published_at]
      );
    }
  }

  // Check Experiments
  const expCount = await getAsync(`SELECT COUNT(*) as count FROM experiments`);
  if (expCount.count === 0) {
    console.log('Seeding initial A/B experiment definition...');
    await runAsync(`
      INSERT OR IGNORE INTO experiments (
        exp_key, name, description, goal_event, target_page, status,
        variant_a_label, variant_a_config, variant_b_label, variant_b_config, winner_variant
      ) VALUES (
        'hero_cta_text',
        'Hero Primary Call-To-Action Test',
        'Tests whether an action-oriented "PLAY OUR GAMES" CTA drives higher click-through to the Games portfolio compared to "EXPLORE THE STUDIO".',
        'cta_click_games',
        '/',
        'active',
        'Variant A (Play Our Games)',
        '{"ctaText": "PLAY OUR GAMES", "heroSubtitle": "Crafting transcendent pixel-art masterpieces and adrenaline-fueled indie experiences.", "badgeText": "🔥 NEW RELEASE: CYBERVANGUARD 2099", "accentColor": "cyan"}',
        'Variant B (Explore Studio)',
        '{"ctaText": "EXPLORE THE STUDIO", "heroSubtitle": "Where retro arcade passion meets next-generation indie gaming innovation.", "badgeText": "🚀 DISCOVER OUR WORLDS", "accentColor": "magenta"}',
        NULL
      )
    `);
  }
}

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync,
  initDatabase
};
