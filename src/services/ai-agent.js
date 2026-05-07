/**
 * AI Agent Integration Service
 * ====================================================================
 * Provides an abstraction layer for integrating with AI providers
 * (OpenAI, Claude, or custom endpoints) for infrastructure automation,
 * log analysis, deployment suggestions, and agent-based task execution.
 * ====================================================================
 */

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');
const { EventEmitter } = require('events');

class AIAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.provider = options.provider || process.env.AI_PROVIDER || 'openai';
    this.endpoint = options.endpoint || process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1';
    this.apiKey = options.apiKey || process.env.AI_API_KEY || '';
    this.model = options.model || process.env.AI_MODEL || 'gpt-4-turbo';
    this.maxTokens = options.maxTokens || parseInt(process.env.AI_MAX_TOKENS || '4096', 10);
    this.temperature = options.temperature || parseFloat(process.env.AI_TEMPERATURE || '0.3');
    this.timeoutMs = options.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
    this.conversationHistory = [];
    this.maxHistoryLength = 50;
  }

  /**
   * Check if the AI agent is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Send a prompt to the AI provider
   */
  async prompt(systemPrompt, userMessage, options = {}) {
    if (!this.isConfigured()) {
      return this._simulateResponse(systemPrompt, userMessage);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-this.maxHistoryLength),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await axios.post(
        `${this.endpoint}/chat/completions`,
        {
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature ?? this.temperature,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeoutMs,
        }
      );

      const result = response.data.choices[0].message.content;

      // Store in conversation history
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: result }
      );

      this.emit('aiResponse', { prompt: userMessage, response: result });
      return result;
    } catch (err) {
      logger.error(`AI API request failed: ${err.message}`);
      return this._simulateResponse(systemPrompt, userMessage);
    }
  }

  /**
   * Analyze deployment logs for errors and suggestions
   */
  async analyzeLogs(logContent) {
    const systemPrompt = `You are an expert DevOps engineer analyzing deployment and infrastructure logs.
      Identify errors, warnings, and potential issues.
      Provide:
      1. Summary of findings
      2. Critical issues (if any)
      3. Recommendations for fixing issues
      4. Performance optimization suggestions
      Format your response as structured markdown.`;

    const userMessage = `Analyze the following infrastructure logs:\n\n\`\`\`\n${logContent.substring(0, 8000)}\n\`\`\``;
    return this.prompt(systemPrompt, userMessage);
  }

  /**
   * Generate deployment scripts based on requirements
   */
  async generateDeploymentScript(requirements) {
    const systemPrompt = `You are an infrastructure automation expert.
      Generate production-ready deployment scripts based on user requirements.
      Include:
      1. Dockerfile configuration
      2. docker-compose setup
      3. Environment configuration
      4. Health check endpoints
      5. Zero-downtime deployment steps
      Provide both shell scripts and configuration files.`;

    const userMessage = `Generate a deployment configuration for: ${requirements}`;
    return this.prompt(systemPrompt, userMessage);
  }

  /**
   * Analyze system health data and provide recommendations
   */
  async analyzeHealthMetrics(healthData) {
    const systemPrompt = `You are a system monitoring expert.
      Analyze server health metrics and provide actionable recommendations.
      Identify:
      1. Resource bottlenecks
      2. Scaling recommendations
      3. Security concerns
      4. Optimization opportunities`;

    const userMessage = `Analyze these health metrics:\n\`\`\`json\n${JSON.stringify(healthData, null, 2)}\n\`\`\``;
    return this.prompt(systemPrompt, userMessage);
  }

  /**
   * Simulate AI response when no API key is configured
   */
  _simulateResponse(systemPrompt, userMessage) {
    const simulations = {
      'deploy': `# AI Deployment Analysis (Simulated)\n\nBased on your deployment request, here's the recommended workflow:\n\n1. **Pre-deployment Checks**\n   - Verify environment variables are set\n   - Run test suite\n   - Check dependency versions\n\n2. **Build & Package**\n   - Build Docker image\n   - Tag with version and git commit hash\n   - Push to container registry\n\n3. **Deployment**\n   - Pull latest image on target server\n   - Run database migrations\n   - Start containers with health checks\n   - Switch traffic to new containers\n\n4. **Post-deployment**\n   - Run smoke tests\n   - Monitor error rates for 5 minutes\n   - Notify team of successful deployment`,
      'analyze': `# Log Analysis Report (Simulated)\n\n## Summary\n- Total entries analyzed: 1,247\n- Errors: 23 (1.8%)\n- Warnings: 89 (7.1%)\n- Info: 1,135 (91.1%)\n\n## Critical Issues Found\n1. **Database connection pool exhaustion** - 3 occurrences\n   - Recommendation: Increase pool size or add connection pooling middleware\n\n2. **Memory usage warning** - 2 occurrences\n   - Recommendation: Investigate memory leaks in API layer\n\n## Recommendations\n- Add request timeout middleware\n- Implement circuit breaker for external API calls\n- Set up log rotation for disk space management`,
      'health': `# Health Analysis Report (Simulated)\n\n## System Status: 🟢 Healthy\n\n## Resource Analysis\n- CPU: 32% average (within normal range)\n- Memory: 4.2GB / 8GB (52.5%)\n- Disk: 120GB / 256GB (46.9%)\n- Uptime: 14 days, 7 hours\n\n## Recommendations\n1. **CPU**: Configure auto-scaling if sustained >70%\n2. **Memory**: Consider increasing RAM for database workloads\n3. **Disk**: Set up automated cleanup of old logs and temp files`,
    };

    let response = simulations['analyze'];
    if (userMessage.toLowerCase().includes('deploy')) response = simulations['deploy'];
    else if (userMessage.toLowerCase().includes('health') || userMessage.toLowerCase().includes('metric')) response = simulations['health'];

    this.emit('aiResponse', { prompt: userMessage, response, simulated: true });
    return Promise.resolve(response + '\n\n> ⚠️ *This is a simulated response. Set AI_API_KEY in .env for real AI-powered analysis.*');
  }

  /**
   * Reset conversation history
   */
  resetConversation() {
    this.conversationHistory = [];
  }

  /**
   * Execute an agent workflow with multiple steps
   */
  async executeWorkflow(workflowSteps, context) {
    const results = [];
    for (const step of workflowSteps) {
      logger.info(`AI Agent executing step: ${step.name}`);
      this.emit('workflowStep', { step: step.name, status: 'running' });

      const prompt = `You are executing step "${step.name}" of an infrastructure workflow.
        Context: ${JSON.stringify(context)}
        Step details: ${step.description || step.name}
        Provide the commands or configuration needed for this step.`;

      const result = await this.prompt(
        'You are an infrastructure automation agent.',
        prompt
      );

      results.push({ step: step.name, result });
      this.emit('workflowStep', { step: step.name, status: 'completed' });
    }
    return results;
  }
}

module.exports = { AIAgent };