import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { routeurAuth, verifierToken } from './routes/auth.js';
import { routeurMe } from './routes/me.js';
import { routeurAlertes } from './routes/alertes.js';
import { routeurIp } from './routes/ip.js';
import { routeurLogs } from './routes/logs.js';
import { routeurEquipements } from './routes/equipements.js';
import { routeurRapports } from './routes/rapports.js';
import { routeurParametres } from './routes/parametres.js';
import { routeurScore } from './routes/score.js';
import { routeurNotifications } from './routes/notifications.js';
import { routeurActivites } from './routes/activites.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes publiques (signup, login, OTP)
app.use('/api', routeurAuth);

// Routes protégées (nécessitent un token JWT valide)
app.use('/api', routeurMe);
app.use('/api', routeurAlertes);
app.use('/api', routeurIp);
app.use('/api', routeurLogs);
app.use('/api', routeurEquipements);
app.use('/api', routeurRapports);
app.use('/api', routeurParametres);
app.use('/api', routeurScore);
app.use('/api', routeurNotifications);
app.use('/api', routeurActivites);

app.get('/api/dashboard', verifierToken, (req, res) => {
	res.json({
		message: 'Accès autorisé au dashboard.',
		utilisateurId: req.utilisateur.utilisateurId
	});
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
	console.log(`Serveur MediShield démarré sur http://localhost:${PORT}`);
});
