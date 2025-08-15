import chalk from 'chalk';

/**
 * Formate une stack trace pour être plus lisible
 */
export const formatStackTrace = (stack) => {
  if (!stack) return null;
  
  return stack
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      // Coloriser pour le développement
      if (process.env.NODE_ENV === 'development') {
        if (index === 0) return chalk.red.bold(line);
        if (line.includes('node_modules')) return chalk.gray(line);
        if (line.includes('src/')) return chalk.yellow(line);
        return chalk.white(line);
      }
      return line;
    });
};

/**
 * Extrait le contexte d'une erreur
 */
export const getErrorContext = (err, req) => {
  const context = {
    requestId: req?.requestId,
    timestamp: new Date().toISOString(),
    errorType: err.constructor.name,
    isOperational: err.isOperational || false,
    source: extractErrorSource(err.stack),
    userAction: inferUserAction(req),
    ...err.context // Contexte personnalisé de l'erreur
  };
  
  return context;
};

/**
 * Extrait la source de l'erreur depuis la stack
 */
const extractErrorSource = (stack) => {
  if (!stack) return null;
  
  const lines = stack.split('\n');
  const sourceLine = lines.find(line => 
    line.includes('src/') && !line.includes('node_modules')
  );
  
  if (sourceLine) {
    const match = sourceLine.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: parseInt(match[3]),
        column: parseInt(match[4])
      };
    }
  }
  
  return null;
};

/**
 * Devine l'action utilisateur depuis la requête
 */
const inferUserAction = (req) => {
  if (!req) return null;
  
  const { method, url } = req;
  const actions = {
    'GET /api/todolists': 'Récupération de toutes les listes',
    'GET /api/todolists/:id': 'Récupération d\'une liste spécifique',
    'POST /api/todolists': 'Création d\'une nouvelle liste',
    'PUT /api/todolists/:id': 'Mise à jour complète d\'une liste',
    'PATCH /api/todolists/:id': 'Mise à jour partielle d\'une liste',
    'DELETE /api/todolists/:id': 'Suppression d\'une liste'
  };
  
  // Normaliser l'URL pour le matching
  const normalizedUrl = url.replace(/\/\d+/g, '/:id');
  const key = `${method} ${normalizedUrl}`;
  
  return actions[key] || `${method} ${url}`;
};

/**
 * Crée un ID de requête unique pour le tracing
 */
export const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};