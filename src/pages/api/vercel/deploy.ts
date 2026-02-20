// Removed Next.js types; using generic request/response
import fetch from 'node-fetch';

/**
 * API endpoint that triggers a Vercel deployment.
 * Expects a JSON body: { repoUrl: string }
 * Uses the VERCEL_TOKEN environment variable (set via admin panel).
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { repoUrl } = req.body;
    if (!repoUrl) {
        return res.status(400).json({ error: 'repoUrl required' });
    }

    const token = process.env.VERCEL_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'Vercel token not configured' });
    }

    // Extract repo identifier (owner/repo) from URL
    const repo = repoUrl.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '');

    const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: 'freybert-panel',
            gitRepository: {
                type: 'github',
                repo,
            },
        }),
    });

    const result = await response.json();
    if (!response.ok) {
        return res.status(500).json({ error: result.error?.message || 'Deployment failed' });
    }

    // Vercel returns a preview URL in result.url
    const previewUrl = `https://${result.name}.${result.url}`;
    res.status(200).json({ url: previewUrl });
}
