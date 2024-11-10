interface Config {
  SIGNIANT_API_URL: string;
  SIGNIANT_CLIENT_ID: string;
  SIGNIANT_CLIENT_SECRET: string;
  env: string;
}

const isDev = process.env.NODE_ENV === 'development';

const config: Config = {
  SIGNIANT_API_URL: 'https://platform-api-service.services.cloud.signiant.com',
  SIGNIANT_CLIENT_ID: 'FPZoq0NMeJ9LBSzkQA2EwJtisUqUMThb',
  SIGNIANT_CLIENT_SECRET: 'JIS3YY45ZUGrX8jt1GDz2htDxHpTbkhTQufZZYa75DCt6w0Jbc1bUItRk3BGSMYn',
  env: isDev ? 'development' : 'production'
};

export default config;
