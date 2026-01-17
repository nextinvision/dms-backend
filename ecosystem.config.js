module.exports = {
  apps: [{
    name: 'backend-dev',
    script: 'npm',
    args: 'start',
    cwd: '/home/fortytwoev/dms-dev/backend',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
