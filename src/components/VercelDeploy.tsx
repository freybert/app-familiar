import { useState } from "react";
import { supabase } from "../lib/supabase"; // adjust path if needed

/**
 * Admin‑only component to configure Vercel deployment.
 * Stores a personal access token securely (via Supabase) and triggers a deployment.
 */
export default function VercelDeploy() {
    const [token, setToken] = useState("");
    const [repo, setRepo] = useState("https://github.com/your-org/freybert");
    const [status, setStatus] = useState<string>("");

    const isAdmin = supabase.auth.getUser()?.data?.metadata?.dni === "75777950";

    if (!isAdmin) return null;

    const saveToken = async () => {
        setStatus("Saving token…");
        const { error } = await supabase.from("admin_secrets").upsert({
            key: "VERCEL_TOKEN",
            value: token,
        });
        if (error) setStatus(`Error: ${error.message}`);
        else setStatus("Token saved.");
    };

    const triggerDeploy = async () => {
        setStatus("Triggering deployment…");
        const res = await fetch("/api/vercel/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repoUrl: repo }),
        });
        const data = await res.json();
        if (res.ok) setStatus(`✅ Deployment started: ${data.url}`);
        else setStatus(`❌ Failed: ${data.error}`);
    };

    return (
        <div className="p-4 border rounded-md bg-gray-50">
            <h2 className="text-xl font-bold mb-2">Vercel Deployment (Admin)</h2>
            <label className="block mb-1">Vercel Personal Access Token</label>
            <input
                type="password"
                className="w-full p-2 border rounded"
                value={token}
                onChange={(e) => setToken(e.target.value)}
            />
            <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                onClick={saveToken}
            >
                Save Token
            </button>

            <hr className="my-4" />

            <label className="block mb-1">GitHub Repository URL</label>
            <input
                type="text"
                className="w-full p-2 border rounded"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
            />
            <button
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
                onClick={triggerDeploy}
            >
                Deploy to Vercel
            </button>

            {status && <p className="mt-3 text-sm">{status}</p>}
        </div>
    );
}
