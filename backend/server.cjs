const express = require("express");

const cors = require("cors");

const apiRoutes = require("./routes/api.cjs");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api", apiRoutes);

const PORT = 3001;

app.listen(PORT, () => {

  console.log(`Backend running on http://localhost:${PORT}`);

});