const path = require('path');
const dotenv = require('dotenv');
const ENV_PATH = path.join(__dirname, '../.env');
dotenv.config({ path: ENV_PATH });
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const swaggerUi    = require('swagger-ui-express');
const swaggerDoc   = require('../swagger.json');
const { PrismaClient } = require('@prisma/client');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const photoRoutes        = require('./routes/photo.routes');
const verificationRoutes = require('./routes/verification.routes');
const gateRoutes         = require('./routes/gate.routes');
const adminRoutes        = require('./routes/admin.routes');
const departmentRoutes   = require('./routes/department.routes');
const errorHandler       = require('./middleware/errorHandler');
const { loadConfig }     = require('./config');
const { verifyEmailService } = require('./services/email.service');
const { loadModels } = require('./services/faceEngine.service');

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.PORT || 5000;
const config = loadConfig();

loadModels().catch((err) => console.warn('[FaceEngine] Preload warning:', err.message));

if (config.missingEmailVariables.length) {
  console.warn(`Email service is not configured. Missing: ${config.missingEmailVariables.join(', ')}. Checked: ${config.envPath} (exists: ${config.envFileExists})`);
} else {
  verifyEmailService(config);
}

const otpCleanup = setInterval(() => {
  prisma.emailOtp.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }).catch((error) => console.warn(`[OTP cleanup] ${error.message}`));
}, 24 * 60 * 60 * 1000);
otpCleanup.unref();

// -- Global middleware ----------------------------------------------------------
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// -- Swagger UI Documentation --------------------------------------------------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// -- Routes ---------------------------------------------------------------------
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/users',        userRoutes);
app.use('/api/v1/photos',       photoRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/gate',         gateRoutes);
app.use('/api/v1/admin',        adminRoutes);
app.use('/api/v1/departments',  departmentRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running', ts: new Date().toISOString() }));

// Serve the Vite build from this service when deployed as a single web app.
const webDist = path.resolve(__dirname, '../../dist');
app.use(express.static(webDist));
app.get(/^(?!\/api(?:\/|$)|\/docs(?:\/|$)).*/, (req, res, next) => {
  res.sendFile(path.join(webDist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));

// Centralized error handler
app.use(errorHandler);

// -- Start ----------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n?? Smart Verification System API`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Docs:   http://localhost:${PORT}/docs\n`);
});

module.exports = app;
