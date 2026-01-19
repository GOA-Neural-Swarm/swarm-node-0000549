const { Octokit } = require("@octokit/rest");
const admin = require('firebase-admin');
const axios = require('axios');
const octokit = new Octokit({ auth: process.env.GH_TOKEN });
const ORG_NAME = "GOA-Neural-Swarm";
const CORE_REPO = "delta-brain-sync";
const REPO_NAME = process.env.GITHUB_REPOSITORY.split('/')[1];
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY)) });
}
const db = admin.firestore();
async function execute() {
    try {
        const coreUrl = `https://raw.githubusercontent.com/${ORG_NAME}/${CORE_REPO}/main/instruction.json`;
        const { data: instruction } = await axios.get(coreUrl);
        await db.collection('cluster_nodes').doc(REPO_NAME).set({
            status: 'LINKED_TO_CORE',
            command: instruction.command,
            power: instruction.core_power,
            last_ping: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Auto-replication Logic inside Node
        if (instruction.replicate === true) {
            const currentNum = parseInt(REPO_NAME.replace('swarm-node-', ''));
            const nextNum = currentNum + 1;
            const nextNodeName = `swarm-node-${String(nextNum).padStart(7, '0')}`;
            try {
                await octokit.repos.get({ owner: ORG_NAME, repo: nextNodeName });
            } catch (e) {
                await octokit.repos.createInOrg({ org: ORG_NAME, name: nextNodeName, auto_init: true });
            }
        }
    } catch (err) { console.error(err); }
}
execute();