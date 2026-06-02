const express = require('express');
const app = express();
app.use(express.json());

const GITLAB_URL = process.env.GITLAB_URL;
const TOKEN = process.env.GITLAB_TOKEN;

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const event = req.body;
  if (event.object_kind !== 'issue') return;
  if (event.object_attributes?.action !== 'close') return;
  const timeSpent = event.object_attributes?.time_stats?.total_time_spent ?? 0;
  if (timeSpent > 0) return;
  const projectId = event.project.id;
  const issueIid = event.object_attributes.iid;
  const username = event.user?.username;
  const base = `${GITLAB_URL}/api/v4/projects/${projectId}/issues/${issueIid}`;
  const headers = { 'PRIVATE-TOKEN': TOKEN, 'Content-Type': 'application/json' };
  await fetch(base, { method: 'PUT', headers, body: JSON.stringify({ state_event: 'reopen' }) });
  await fetch(`${base}/notes`, { method: 'POST', headers, body: JSON.stringify({ body: `🚫 @${username} This issue cannot be closed yet.\n\nNo time has been logged. Please enter hours spent using:\n\n\`/spend 2h\`\n\nThen close the issue again.` }) });
});

app.listen(3000, () => console.log('Running'));
