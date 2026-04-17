const dotenv = require("dotenv");
const app = require("./src/app");

dotenv.config();

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`AI Symptom Checker Service running on port ${PORT}`);
});
