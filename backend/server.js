require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startAgent } = require('./src/services/agentic');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    // start agentic assignment
    startAgent();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();