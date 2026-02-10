export async function fetchGtmConfig(
  token: string,
  config: { accountId: string; containerId: string; workspaceId: string },
  resourceId: string,
  fetchImpl: typeof fetch = fetch
) {
  const { accountId, containerId, workspaceId } = config;
  if (!accountId || !containerId || !workspaceId) {
    throw new Error("Missing GTM configuration in task_config (accountId, containerId, workspaceId required).");
  }

  // Security Check: Ensure resourceId does not contain path traversal characters
  if (!resourceId || !/^[a-zA-Z0-9_.-]+$/.test(String(resourceId))) {
      throw new Error("Invalid resource ID format.");
  }

  const baseUrl = `https://tagmanager.googleapis.com/api/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
  const resourceUrl = `${baseUrl}/tags/${resourceId}`;

  const response = await fetchImpl(resourceUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
     const errorText = await response.text();
     throw new Error(`GTM API Fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}
