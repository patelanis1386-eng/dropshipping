const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/dropshipping',
  jwtSecret: process.env.JWT_SECRET || 'shoppro_jwt_secret_key_2026',
  stripeKey: process.env.STRIPE_KEY || 'sk_test_placeholder',
};

module.exports = config;
