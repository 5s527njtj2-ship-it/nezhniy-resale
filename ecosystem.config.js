module.exports = {
  apps: [
    {
      name: 'resale-backend',
      script: './backend/index.js',
      cwd: '/var/www/nezhniy-resale',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '300M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
    },
    {
      name: 'resale-bot',
      script: './bot/bot.js',
      cwd: '/var/www/nezhniy-resale',
      max_memory_restart: '100M',
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
    },
  ],
}
