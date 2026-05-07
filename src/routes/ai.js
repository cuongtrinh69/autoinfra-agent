/**
 * AI Agent Routes
 * ====================================================================
 * AI-assisted infrastructure automation endpoints.
 * Supports log analysis, deployment generation, health analysis,
 * and multi-step agent workflows.
 * ====================================================================
 */

'use strict';

const { Router } = require('express');
const { AIAgent } = require('../services/ai-agent');
const logger = require('../utils/logger');
const router = Router();

const aiAgent = new AIAgent();

/**
 * POST /api/ai/analyze-logs — Analyze deployment/log content
 */
router.post('/analyze-logs', async (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs) return res.status(400).json({ error: 'Log content is required' });

    const analysis = await aiAgent.analyzeLogs(logs);
    res.json({ success: true, analysis, simulated: !aiAgent.isConfigured() });
  } catch (err) {
    logger.error(`AI log analysis failed: ${err.message}`);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/ai/generate-deployment — Generate deployment config
 */
router.post('/generate-deployment', async (req, res) => {
  try {
    const { requirements } = req.body;
    if (!requirements) return res.status(400).json({ error: 'Requirements are required' });

    const config = await aiAgent.generateDeploymentScript(requirements);
    res.json({ success: true, config, simulated: !aiAgent.isConfigured() });
  } catch (err) {
    logger.error(`AI deployment generation failed: ${err.message}`);
    res.status(500).json({ error: 'Generation failed' });
  }
});

/**
 * POST /api/ai/analyze-health — Analyze health metrics
 */
router.post('/analyze-health', async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!metrics) return res.status(400).json({ error: 'Health metrics are required' });

    const analysis = await aiAgent.analyzeHealthMetrics(metrics);
    res.json({ success: true, analysis, simulated: !aiAgent.isConfigured() });
  } catch (err) {
    logger.error(`AI health analysis failed: ${err.message}`);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/ai/prompt — Custom AI prompt
 */
router.post('/prompt', async (req, res) => {
  try {
    const { system, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const response = await aiAgent.prompt(
      system || 'You are an infrastructure automation assistant.',
      message
    );
    res.json({ success: true, response, simulated: !aiAgent.isConfigured() });
  } catch (err) {
    logger.error(`AI prompt failed: ${err.message}`);
    res.status(500).json({ error: 'AI request failed' });
  }
});

/**
 * POST /api/ai/workflow — Execute multi-step AI workflow
 */
router.post('/workflow', async (req, res) => {
  try {
    const { steps, context } = req.body;
    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Workflow steps array is required' });
    }

    const results = await aiAgent.executeWorkflow(steps, context || {});
    res.json({ success: true, results, simulated: !aiAgent.isConfigured() });
  } catch (err) {
    logger.error(`AI workflow execution failed: ${err.message}`);
    res.status(500).json({ error: 'Workflow execution failed' });
  }
});

/**
 * GET /api/ai/status — Check AI agent configuration status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: aiAgent.isConfigured(),
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-4-turbo',
    simulated: !aiAgent.isConfigured(),
  });
});

/**
 * POST /api/ai/reset — Reset AI conversation history
 */
router.post('/reset', (req, res) => {
  aiAgent.resetConversation();
  res.json({ success: true, message: 'Conversation history reset' });
});

module.exports = router;