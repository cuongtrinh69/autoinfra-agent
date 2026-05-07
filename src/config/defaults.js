/**
 * Default Configuration Values
 * ====================================================================
 * Fallback defaults used when environment variables are not set.
 * ====================================================================
 */

'use strict';

module.exports = {
  deployment: {
    workflows: [
      {
        id: 'quick-deploy',
        name: 'Quick Deploy (Node.js)',
        description: 'Deploy a Node.js application with zero-downtime',
        steps: [
          'git-clone',
          'install-deps',
          'run-tests',
          'build-assets',
          'container-build',
          'health-check',
          'switch-traffic',
        ],
        estimateSeconds: 120,
      },
      {
        id: 'full-stack',
        name: 'Full-Stack Deployment',
        description: 'Deploy frontend + backend with database migrations',
        steps: [
          'git-clone',
          'install-deps',
          'db-migrate',
          'run-tests',
          'build-assets',
          'container-build',
          'container-push',
          'health-check',
          'switch-traffic',
          'smoke-test',
        ],
        estimateSeconds: 300,
      },
      {
        id: 'rollback',
        name: 'Rollback to Previous Version',
        description: 'Revert to the last known-good deployment',
        steps: [
          'fetch-previous',
          'verify-artifact',
          'switch-traffic',
          'health-check',
          'notify',
        ],
        estimateSeconds: 60,
      },
    ],
  },
  containers: {
    defaultRegistry: 'docker.io',
    restartPolicies: ['no', 'always', 'on-failure', 'unless-stopped'],
  },
  monitoring: {
    thresholds: {
      cpu: 80,        // alert if CPU > 80%
      memory: 85,     // alert if memory > 85%
      disk: 90,       // alert if disk > 90%
      uptime: 99.5,   // target uptime %
    },
  },
};