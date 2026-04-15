require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/db");

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    if (!PORT) {
      throw new Error("PORT is not defined in environment variables.");
    }

    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Telemedicine service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start telemedicine service:", error.message);
    process.exit(1);
  }
};

startServer();
