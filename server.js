import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./swagger.js";

const app = express();
app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Default route
app.get("/", (req, res) => {
  res.send(`
    <h2>Refy Swagger is running 🎉</h2>
    <p>Open <a href="/docs">/docs</a> to view the API documentation.</p>
  `);
});

const PORT = 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
