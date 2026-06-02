require('dotenv').config();

const express = require('express');

const app = express();
app.use(express.json());

const GITLAB_URL = process.env.GITLAB_URL;
const TOKEN = process.env.GITLAB_TOKEN;
const PORT = process.env.PORT || 3000;

app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log(
      `Received event: ${event.object_kind} | Action: ${event.object_attributes?.action}`
    );

    // Process only issue events
    if (event.object_kind !== 'issue') {
      return res.sendStatus(200);
    }

    const issue = event.object_attributes;

    // Only process CLOSED issues
    if (issue.state !== 'closed') {
      return res.sendStatus(200);
    }

    const totalTimeSpent = issue.total_time_spent || 0;

    console.log(`Issue #${issue.iid} closed`);
    console.log(`Time spent: ${totalTimeSpent} seconds`);

    // Time already logged
    if (totalTimeSpent > 0) {
      console.log('Time already logged. No action needed.');
      return res.sendStatus(200);
    }

    const projectId = event.project.id;
    const issueIid = issue.iid;
    const username = event.user?.username || 'user';

    const baseUrl =
      `${GITLAB_URL}/api/v4/projects/${projectId}/issues/${issueIid}`;

    const headers = {
      'PRIVATE-TOKEN': TOKEN,
      'Content-Type': 'application/json'
    };

    console.log(`Reopening issue #${issueIid}`);

    // Reopen issue
    const reopenResponse = await fetch(baseUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        state_event: 'reopen'
      })
    });

    const reopenText = await reopenResponse.text();

    console.log(
      `Reopen response: ${reopenResponse.status} ${reopenText}`
    );

    // Add comment
    const commentResponse = await fetch(`${baseUrl}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        body: `🚫 @${username}

This issue cannot be closed yet because no time has been logged.

Please log the time spent using:

/spend 2h

(or the actual time spent)

After logging time, you may close the issue again.`
      })
    });

    const commentText = await commentResponse.text();

    console.log(
      `Comment response: ${commentResponse.status} ${commentText}`
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.send('GitLab webhook running');
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
