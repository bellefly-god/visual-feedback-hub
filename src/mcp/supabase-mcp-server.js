#!/usr/bin/env node

/**
 * Supabase MCP Server for Visual Feedback Hub
 * 
 * Usage:
 *   node supabase-mcp-server.js
 *   # or with npx: npx supabase-mcp-server
 */

const http = require('http');
const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bmmebxdeiidfoudlydsi.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fJ8NMOelRZmhBgNMdg04KA_lcdknlEg';

function supabaseRequest(table, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function listProjects(limit = 20) {
  return supabaseRequest('projects', {
    select: '*,comments:comments(count)',
    limit,
    order: 'created_at.desc'
  });
}

function listComments(projectId, limit = 100) {
  return supabaseRequest('comments', {
    select: '*',
    eq: `project_id.${projectId}`,
    limit,
    order: 'display_order.asc'
  });
}

function getProjectStats() {
  return Promise.all([
    supabaseRequest('projects', { select: 'count' }),
    supabaseRequest('comments', { select: 'count' }),
    supabaseRequest('comments', { select: 'status', eq: 'status.eq.pending' }),
  ]).then(([projects, allComments, pendingComments]) => ({
    totalProjects: projects.length,
    totalComments: allComments.length,
    pendingComments: pendingComments.length
  }));
}

// MCP Protocol over stdio
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let buffer = '';

rl.on('line', async (line) => {
  if (line === '') return;
  
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'initialize') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'supabase-mcp', version: '1.0.0' }
        }
      }) + '\n');
    }
    else if (request.method === 'tools/list') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            { name: 'list_projects', description: 'List all projects', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
            { name: 'list_comments', description: 'List comments for a project', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, limit: { type: 'number' } } } },
            { name: 'get_stats', description: 'Get project statistics' },
            { name: 'query_custom', description: 'Custom query', inputSchema: { type: 'object', properties: { table: { type: 'string' }, filters: { type: 'object' } } } },
          ]
        }
      }) + '\n');
    }
    else if (request.method === 'tools/call') {
      const { name, arguments: args = {} } = request.params;
      
      let result;
      switch (name) {
        case 'list_projects':
          result = await listProjects(args.limit || 20);
          break;
        case 'list_comments':
          result = await listComments(args.project_id, args.limit || 100);
          break;
        case 'get_stats':
          result = await getProjectStats();
          break;
        case 'query_custom':
          result = await supabaseRequest(args.table, args.filters || {});
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }) + '\n');
    }
    else if (request.method === 'notifications/initialized') {
      // Handled
    }
  } catch (e) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: e.message }
    }) + '\n');
  }
});
