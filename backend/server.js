const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// routes imports
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const testRoutes = require("./routes/testRoute");

// routes usage
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/test", testRoutes);

// root route
app.get("/", (req, res) => {
  res.send("Job Board API Running");
});

// server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
  
// error handling middleware
const errorMiddleware = require("./middleware/errorMiddleware");
app.use(errorMiddleware);