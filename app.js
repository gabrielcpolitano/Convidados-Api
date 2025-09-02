import express from "express";
import cors from 'cors';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, boolean, timestamp, serial } from 'drizzle-orm/pg-core';
import { eq, ilike, sql } from 'drizzle-orm';
import { createServer } from "http";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from 'url';

// Para __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Drizzle Configuration (for migrations if needed)
// Run: npx drizzle-kit push --config=inline
const drizzleConfig = {
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://lista_convidados_user:Q2E2ndC3pZrsJ8wwjqQT6A2f1nIYeo6V@dpg-d2r2k7je5dus73cos4mg-a.oregon-postgres.render.com/lista_convidados"
  },
};

// Database Schema
const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  side: text("side").notNull(),
  present: boolean("present").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

const insertGuestSchema = createInsertSchema(guests).pick({
  name: true,
  side: true,
});

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Database Connection
const databaseUrl = "postgresql://lista_convidados_user:Q2E2ndC3pZrsJ8wwjqQT6A2f1nIYeo6V@dpg-d2r2k7je5dus73cos4mg-a.oregon-postgres.render.com/lista_convidados";

const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 10
});

const db = drizzle({ client: pool, schema: { guests } });

// Test database connection
console.log("🔄 Testing database connection...");
pool.connect().then((client) => {
  console.log("✅ Database connected successfully");
  client.release();
}).catch((error) => {
  console.error("❌ Database connection failed:", error.message);
});

// Storage Class
class DatabaseStorage {
  async getGuest(id) {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest || undefined;
  }

  async getAllGuests() {
    const allGuests = await db.select().from(guests);
    return allGuests.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGuest(insertGuest) {
    const [guest] = await db
      .insert(guests)
      .values(insertGuest)
      .returning();
    return guest;
  }

  async updateGuestPresence(id, present) {
    const [guest] = await db
      .update(guests)
      .set({ present })
      .where(eq(guests.id, id))
      .returning();
    return guest || undefined;
  }

  async deleteGuest(id) {
    const result = await db
      .delete(guests)
      .where(eq(guests.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchGuests(searchTerm) {
    const foundGuests = await db
      .select()
      .from(guests)
      .where(ilike(guests.name, `%${searchTerm}%`));
    return foundGuests.sort((a, b) => a.name.localeCompare(b.name));
  }
}

const storage = new DatabaseStorage();

// Express App Setup
const app = express();

// Enable CORS for all origins
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging Middleware
function log(message) {
  console.log(`${new Date().toLocaleTimeString()} [express] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// API Routes
// Admin login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    if (username === "casamento" && password === "1995") {
      res.json({ success: true, message: "Login realizado com sucesso" });
    } else {
      res.status(401).json({ success: false, message: "Credenciais inválidas" });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: "Dados inválidos" });
  }
});

// Get all guests or search
app.get("/api/guests", async (req, res) => {
  try {
    const { search } = req.query;
    
    if (search && typeof search === "string") {
      const foundGuests = await storage.searchGuests(search);
      res.json(foundGuests);
    } else {
      const allGuests = await storage.getAllGuests();
      res.json(allGuests);
    }
  } catch (error) {
    console.error('Error getting guests:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Add new guest
app.post("/api/guests", async (req, res) => {
  try {
    const guestData = insertGuestSchema.parse(req.body);
    const guest = await storage.createGuest(guestData);
    res.status(201).json(guest);
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(400).json({ message: "Dados inválidos" });
  }
});

// Update guest presence
app.post("/api/guests/:id/presence", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { present } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const guest = await storage.updateGuestPresence(id, present);
    
    if (!guest) {
      return res.status(404).json({ message: "Convidado não encontrado" });
    }

    res.json(guest);
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Delete guest
app.delete("/api/guests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const success = await storage.deleteGuest(id);
    
    if (!success) {
      return res.status(404).json({ message: "Convidado não encontrado" });
    }

    res.json({ success: true, message: "Convidado removido com sucesso" });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Get only present guests
app.get("/api/guests/present", async (req, res) => {
  try {
    const allGuests = await storage.getAllGuests();
    const presentGuests = allGuests.filter(guest => guest.present);
    res.json(presentGuests);
  } catch (error) {
    console.error('Error getting present guests:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Error Handler
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error('Server error:', err);
});

// Backend only - no static file serving

// Start Server
const port = parseInt(process.env.PORT || '5000', 10);
const server = createServer(app);

server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});