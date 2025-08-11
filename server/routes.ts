import express from "express";
import authRoutes from "./routes/auth";
import settingsRoutes from "./routes/settings";
import templatesRoutes from "./routes/templates";
import automationRoutes from "./routes/automation";
import contactsRoutes from "./routes/contacts";
import conversationsRoutes from "./routes/conversations";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-organization-id, x-user-id");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Mount routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/templates", templatesRoutes);
app.use("/api/v1/automation", automationRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/conversations", conversationsRoutes);

export default app;
