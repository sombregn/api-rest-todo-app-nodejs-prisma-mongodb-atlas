ais # Utilise l'image officielle Node.js comme base
FROM node:18-alpine

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances
RUN npm ci --only=production

# Copie le reste du code source
COPY . .

# Génère le client Prisma
RUN npx prisma generate

# Expose le port que l'application utilise
EXPOSE 3000

# Crée un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change la propriété des fichiers à l'utilisateur nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Commande pour démarrer l'application
CMD ["npm", "start"]